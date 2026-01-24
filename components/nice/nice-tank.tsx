'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplets, Flame, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { collectNice, NiceState } from '@/app/actions/nice-actions'

interface NiceTankProps {
    initialState: NiceState
    onCollect: (amount: number) => void
}

export function NiceTank({ initialState, onCollect }: NiceTankProps) {
    const [tankNice, setTankNice] = useState(initialState.tankNice)
    const [isCollecting, setIsCollecting] = useState(false)

    // Use ref to track calculating value without triggering re-renders for every micro-update
    // but we DO want to render the number frequently, so state is appropriate here.
    // We use the ref to calculate the delta accurately.
    const lastUpdateRef = useRef(Date.now())
    const stateRef = useRef(initialState)

    // Update ref when initial state changes (e.g. after collection or revalidation)
    useEffect(() => {
        stateRef.current = initialState
        setTankNice(initialState.tankNice)
        lastUpdateRef.current = Date.now()
    }, [initialState])

    useEffect(() => {
        let animationFrame: number

        const animate = () => {
            const now = Date.now()
            const deltaSeconds = (now - lastUpdateRef.current) / 1000
            lastUpdateRef.current = now

            const { nicePerSecond, tankCapacity } = stateRef.current

            setTankNice(prev => {
                const nextValue = prev + (nicePerSecond * deltaSeconds)
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

            toast.success(`Collected ${result.niceCollected} Nice!`, {
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
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl p-6">
            {/* Background decoration */}
            <div className="absolute top-6 right-6 pointer-events-none opacity-[0.3]">
                <img
                    src="/images/tanuki-nice.jpg"
                    alt="Tanuki Character"
                    className="w-24 h-auto object-contain grayscale"
                />
            </div>

            <div className="flex flex-col gap-6 relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Nice Generator
                        </h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-mono font-bold text-slate-800 tracking-tighter tabular-nums">
                                {tankNice.toFixed(5)}
                            </span>
                            <span className="text-sm text-slate-400 font-medium">nice</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                                +{stateRef.current.nicePerSecond.toFixed(4)}/sec
                            </span>
                            {stateRef.current.currentMultiplier > 1 && (
                                <span className="flex items-center gap-1 text-amber-600 font-bold">
                                    <Flame size={12} className="fill-amber-600" />
                                    {stateRef.current.currentMultiplier}x Boost Active
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Multiplier Badge if active */}
                    {stateRef.current.currentMultiplier > 1 && (
                        <div className="animate-pulse bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 rounded-lg p-2 flex flex-col items-center">
                            <Flame className="text-orange-500 mb-1" size={20} />
                            <span className="text-xs font-bold text-orange-700">{stateRef.current.currentMultiplier}x</span>
                        </div>
                    )}
                </div>

                {/* Tank Visualization */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                        <span>Fill Level</span>
                        <span className={isFull ? 'text-red-500 animate-pulse font-bold' : ''}>
                            {Math.min(fillPercentage, 100).toFixed(0)}%
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
                    <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-widest">
                        <span>0</span>
                        <span>50% (Collect)</span>
                        <span>{stateRef.current.tankCapacity}</span>
                    </div>
                </div>

                {/* Collection Button */}
                <Button
                    size="lg"
                    className={`w-full font-bold shadow-lg transition-all 
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
                            COLLECT {Math.floor(tankNice)} NICE
                        </span>
                    ) : (
                        <span>Wait for 50% to Collect</span>
                    )}
                </Button>
            </div>
        </div>
    )
}
