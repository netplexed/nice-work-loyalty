'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplets, Flame, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { collectNice, NiceState } from '@/app/actions/nice-actions'
import { InfoModal } from '@/components/ui/info-modal'

interface NiceTankProps {
    initialState: NiceState
    onCollect: (amount: number) => void
}

export function NiceTank({ initialState, onCollect }: NiceTankProps) {
    const [tankNice, setTankNice] = useState(initialState.tankNice)
    const [isCollecting, setIsCollecting] = useState(false)

    // Use refs to track calculating value without triggering re-renders for every micro-update.
    const lastUpdateRef = useRef(Date.now())
    const stateRef = useRef(initialState)
    const serverSnapshotRef = useRef({
        tankNice: initialState.tankNice,
        time: Date.now()
    })

    // Update ref when initial state changes (e.g. after collection or revalidation)
    useEffect(() => {
        stateRef.current = initialState

        // When optimistic collection happens, the amount is precisely 0
        if (initialState.tankNice === 0) {
            setTankNice(0)
        }

        // We DO NOT instantly jump tankNice to initialState.tankNice (except on collect).
        // Instead, we record the server snapshot to smoothly catch up to it visually.
        serverSnapshotRef.current = {
            tankNice: initialState.tankNice,
            time: Date.now()
        }
    }, [initialState])

    useEffect(() => {
        let animationFrame: number

        const animate = () => {
            const now = Date.now()
            const deltaSeconds = (now - lastUpdateRef.current) / 1000
            lastUpdateRef.current = now

            const { nicePerSecond, tankCapacity } = stateRef.current

            // Calculate exactly where the server expects the value to be right now
            const timeSinceSnapshot = (now - serverSnapshotRef.current.time) / 1000
            const projectedServerNice = serverSnapshotRef.current.tankNice + (nicePerSecond * timeSinceSnapshot)

            setTankNice(prev => {
                let nextValue = prev + (nicePerSecond * deltaSeconds)

                // Gap between our current animated value and the true projected server value
                const gap = projectedServerNice - nextValue

                // If local is behind the server (e.g. background data fetched), catch up smoothly
                if (gap > 0.001) {
                    // Close the gap by a percentage plus a minimum speed so it finishes
                    const catchUpSpeed = Math.max(gap * 3, 2)
                    const catchUp = catchUpSpeed * deltaSeconds
                    nextValue += catchUp

                    // Don't overshoot the true value
                    if (nextValue > projectedServerNice) {
                        nextValue = projectedServerNice
                    }
                } else if (gap < -0.5) {
                    // If we are significantly ahead (like when collecting and the server state resets to ~0
                    // while our local state was just at ~50), we must snap instantly rather than slow drain.
                    // A gap < -0.5 means local `nextValue` is at least 0.5 HIGHER than `projectedServerNice`
                    nextValue = projectedServerNice
                }

                return Math.min(nextValue, tankCapacity)
            })

            animationFrame = requestAnimationFrame(animate)
        }

        // Only start animation if page is visible to save battery
        const handleVisibilityChange = () => {
            if (document.hidden) {
                cancelAnimationFrame(animationFrame)
            } else {
                // Reset last update to avoid huge jump
                lastUpdateRef.current = Date.now()
                animationFrame = requestAnimationFrame(animate)
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        animationFrame = requestAnimationFrame(animate)

        return () => {
            cancelAnimationFrame(animationFrame)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])

    const fillPercentage = (tankNice / stateRef.current.tankCapacity) * 100
    const isFull = fillPercentage >= 100
    const canCollect = fillPercentage >= 50

    const handleCollect = async () => {
        if (!canCollect || isCollecting) return

        setIsCollecting(true)

        // Trigger confetti if significant amount
        if (tankNice > 100) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FBBF24', '#F59E0B', '#D97706']
            })
        }

        try {
            const result = await collectNice()

            // Optimistic update
            setTankNice(0)
            stateRef.current = {
                ...stateRef.current,
                tankNice: 0,
                lastCollectedAt: new Date().toISOString()
            }
            lastUpdateRef.current = Date.now()

            toast.success(`Collected ${result.niceCollected} nice!`, {
                description: "Added to your main balance."
            })

            // Notify parent to update balance immediately
            onCollect(result.niceCollected)

        } catch (error: any) {
            console.error("Collection error:", error)
            toast.error("Failed to collect Nice", {
                description: error.message || "Please try again"
            })
        } finally {
            setIsCollecting(false)
        }
    }

    // Visual Helper for gradient color based on percentage
    const getGradientColor = (p: number) => {
        if (p < 25) return 'bg-blue-500'
        if (p < 50) return 'bg-cyan-500'
        if (p < 75) return 'bg-amber-500'
        return 'bg-gradient-to-r from-orange-500 to-red-500'
    }

    return (
        <div className="relative overflow-hidden rounded-[var(--card-radius)] bg-white border border-slate-200 shadow-[var(--card-shadow)] p-[var(--card-padding)]">
            {/* Background decoration with Vertical Fill Meter */}
            <div className="absolute top-6 right-6 pointer-events-none w-24">
                {/* 1. Empty State */}
                <img
                    src="/images/tanuki-nice.jpg"
                    alt="Tanuki Empty"
                    className="w-24 h-auto object-contain grayscale opacity-[0.3]"
                />

                {/* 2. Fill State Overlay */}
                <div
                    className="absolute inset-0 transition-all duration-500 ease-linear"
                    style={{ clipPath: `inset(${100 - Math.min(fillPercentage, 100)}% 0 0 0)` }}
                >
                    <div className="relative w-full h-full">
                        {/* Gradient base masked to image shape */}
                        <div
                            className="absolute inset-0 bg-gradient-to-t from-[#FFB347] to-[#FFCC5C]"
                            style={{
                                maskImage: 'url(/images/tanuki-nice-mask.png)',
                                WebkitMaskImage: 'url(/images/tanuki-nice-mask.png)',
                                maskSize: 'contain',
                                WebkitMaskSize: 'contain',
                                maskPosition: 'center',
                                WebkitMaskPosition: 'center',
                                maskRepeat: 'no-repeat',
                                WebkitMaskRepeat: 'no-repeat'
                            }}
                        />
                        {/* Outline & details using multiply */}
                        <img
                            src="/images/tanuki-nice.jpg"
                            alt="Tanuki Filled"
                            className="absolute inset-0 w-full h-full object-contain mix-blend-multiply"
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6 relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-[length:var(--font-size-header)] font-[var(--font-weight-semibold)] text-slate-500 tracking-[0.5px] leading-[var(--line-height-normal)] mb-1 flex items-center">
                            <span className="opacity-[0.7]">Nice Tank</span>
                            <InfoModal
                                title="Nice Tank"
                                description="Your nice tank automatically generates nice currency 24/7, even when you're not dining with us. Pop into the app regularly to collect your nice before the tank fills up. Higher membership tiers generate nice faster!"
                            />
                        </h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[length:var(--font-size-display-large)] font-[var(--font-weight-bold)] font-mono text-slate-800 tracking-tighter tabular-nums leading-[var(--line-height-tight)]">
                                {tankNice.toFixed(5)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[length:var(--font-size-small)] text-slate-500 leading-[var(--line-height-normal)] opacity-[0.7]">
                            <span className="text-[length:var(--font-size-body)] font-[var(--font-weight-regular)] text-slate-500 leading-[var(--line-height-relaxed)]">nice</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                                +{initialState.nicePerSecond.toFixed(4)}/sec
                            </span>

                            {/* Multiplier Badge - Inline with Rate */}
                            {initialState.currentMultiplier > 1 && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-100 animate-pulse">
                                    <Flame
                                        size={14}
                                        className={initialState.currentMultiplier >= 3 ? 'text-red-600 fill-red-600' : 'text-orange-500 fill-orange-500'}
                                    />
                                    <span className="font-bold text-orange-700 text-xs">
                                        {initialState.currentMultiplier}x {initialState.currentMultiplier >= 3 ? 'SUPER' : 'Boost'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Tank Visualization */}
                <div className="space-y-2 mt-2">
                    <div className="flex justify-between text-[length:var(--font-size-body)] font-[var(--font-weight-regular)] text-slate-500 leading-[var(--line-height-relaxed)]">
                        <span>Fill Level</span>
                        <span className={isFull ? 'text-red-500 animate-pulse font-[var(--font-weight-semibold)]' : 'font-[var(--font-weight-semibold)]'}>
                            {Math.min(fillPercentage, 100).toFixed(2)}%
                        </span>
                    </div>
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden relative">
                        <motion.div
                            className={`h-full absolute left-0 top-0 rounded-full ${getGradientColor(fillPercentage)}`}
                            style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                            initial={false}
                            animate={{ width: `${Math.min(fillPercentage, 100)}%` }}
                            transition={{ type: "tween", ease: "linear", duration: 0.5 }}
                        />

                        {/* 50% Marker */}
                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/50 z-10" />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 tracking-widest">
                        <span>0</span>
                        <span>50% (Collect)</span>
                        <span>{stateRef.current.tankCapacity}</span>
                    </div>
                </div>

                {/* Collection Button */}
                <Button
                    size="lg"
                    className={`w-full font-[var(--font-weight-semibold)] text-[length:var(--font-size-button)] shadow-lg transition-all 
                ${canCollect
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white transform hover:scale-[1.02]'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                        }`}
                    disabled={!canCollect || isCollecting}
                    onClick={handleCollect}
                >
                    {isCollecting ? (
                        <span className="flex items-center gap-2">
                            <Sparkles className="animate-spin" /> Collecting...
                        </span>
                    ) : canCollect ? (
                        <span className="flex items-center gap-2">
                            <Sparkles className="fill-white/20" />
                            Collect {Math.floor(tankNice)} nice
                        </span>
                    ) : (
                        <span>Wait for 50% to Collect</span>
                    )}
                </Button>
            </div>
        </div>
    )
}
