'use client'

import { useState, useRef } from 'react'
import { motion, useAnimation } from 'framer-motion'
import confetti from 'canvas-confetti'
import { SpinPrize, spin } from '@/app/actions/spin-actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { formatDistanceToNow } from 'date-fns'

interface SpinWheelProps {
    prizes: SpinPrize[]
    onSpinComplete?: () => void
    nextSpinTime?: string | null
}

export function SpinWheel({ prizes, onSpinComplete, nextSpinTime }: SpinWheelProps) {
    const [spinning, setSpinning] = useState(false)
    const [result, setResult] = useState<SpinPrize | null>(null)
    const [showResult, setShowResult] = useState(false)
    const controls = useAnimation()
    const currentRotation = useRef(0)

    // Check if locked
    const isLocked = nextSpinTime && new Date(nextSpinTime) > new Date()

    const handleSpin = async () => {
        if (spinning) return
        setSpinning(true)

        try {
            // Start spinning animation (indefinite or fast) visually first?
            // Actually, best to get result first for deterministic stop, 
            // but we can animate a "loading" spin if needed. 
            // For now, let's just do the action.

            const response = await spin()

            if (!response.success || !response.prize) {
                toast.error(response.error || 'Failed to spin. Please try again.')
                setSpinning(false)
                return
            }

            const winningPrize = response.prize
            setResult(winningPrize)

            // Calculate angle
            const prizeIndex = prizes.findIndex(p => p.id === winningPrize.id)
            if (prizeIndex === -1) {
                // Should not happen if config is synced, but fallback
                toast.error('Error finding prize segment.')
                setSpinning(false)
                return
            }

            const segmentAngle = 360 / prizes.length
            // We want the pointer (top, usually 270 or -90 deg in SVG) to land on the center of the segment.
            // If we start at 0, segment 0 is usually 0-X degrees. 
            // Let's assume standard unit circle, 0 is right.
            // Adjust calculations for "Pointer at Top" (270 deg).

            // Random jitter within the segment to look natural (+/- 40% of segment width)
            const jitter = (Math.random() - 0.5) * segmentAngle * 0.8

            // To land on index i, we need to rotate such that that segment is at the pointer.
            // Pointer is at -90deg (top).
            // Segment i center is at: i * segmentAngle + segmentAngle/2
            // We need: Rotation + (i * segmentAngle + segmentAngle/2) = -90 (mod 360)
            // So: Rotation = -90 - (i * segmentAngle + segmentAngle/2)

            // Additive Rotation Logic
            const baseSpins = 5 // 5 full rotations minimum

            // Current position in 0-360 range (normalized)
            const currentAngle = currentRotation.current % 360

            // Target angle (where we want to end up, 0-360)
            // Original logic: -90 - (index * segment + segment/2)
            // We need to match this coordinate system.
            // Let's simplify:
            // We want pointer (-90deg relative to wheel 0) to point to center of segment.
            // Segment center is at (index * segmentAngle + segmentAngle/2).
            // So we need to rotate wheel by R such that:
            // (-90 - R) % 360 = SegmentCenter
            // => -R = SegmentCenter + 90
            // => R = - (SegmentCenter + 90)

            const segmentCenter = (prizeIndex * segmentAngle) + (segmentAngle / 2)
            const desiredRotationDisplay = - (segmentCenter + 90) + jitter

            // Calculate how much we need to add to currentRotation.current
            // We want (currentRotation.current + delta) % 360 ~= desiredRotationDisplay % 360

            // Let's work with raw deltas to ensure forward spin
            // We want to land on 'desiredRotationDisplay'. 
            // It might be negative, let's make it positive mod 360 for calculation:
            let targetMod = desiredRotationDisplay % 360
            if (targetMod < 0) targetMod += 360

            let currentMod = currentRotation.current % 360
            if (currentMod < 0) currentMod += 360

            // Calculate forward distance to target
            let distance = targetMod - currentMod
            if (distance <= 0) distance += 360 // Ensure we go forward

            // Add base full spins
            const totalRotationDelta = (baseSpins * 360) + distance

            const newRotation = currentRotation.current + totalRotationDelta
            currentRotation.current = newRotation

            await controls.start({
                rotate: newRotation,
                transition: {
                    duration: 4, // Slightly faster feel
                    ease: [0.25, 0.1, 0.25, 1], // Custom Bezier for nicer spin up/down
                }
            })

            // Success handling
            setShowResult(true)
            if (winningPrize.type !== 'loss') {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                })
            }

            if (onSpinComplete) onSpinComplete()

        } catch (e) {
            console.error(e)
            toast.error('Something went wrong.')
        } finally {
            setSpinning(false)
            // Reset rotation visually after a delay if needed, 
            // but keeping it there is fine until closed
        }
    }

    const resetWheel = () => {
        setShowResult(false)
        setResult(null)
        // DONT reset rotation to 0, keep it cumulative
    }

    if (prizes.length === 0) {
        return <div className="text-center p-4">Loading wheel...</div>
    }

    const segmentAngle = 360 / prizes.length
    const radius = 150
    // Calculate path for a segment slice
    // Using simple SVG trigonometry
    // A slice is a path from center (0,0) to (r, 0) arc to (r*cos(a), r*sin(a)) line to (0,0)

    // Convert polar to cartesian
    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent) * radius
        const y = Math.sin(2 * Math.PI * percent) * radius
        return [x, y]
    }

    return (
        <div className="flex flex-col items-center justify-center space-y-8 py-8 relative">
            <div className="relative">
                {/* Pointer */}
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20 text-primary drop-shadow-md">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                        <path d="M20 40L35 15C35 15 35 0 20 0C5 0 5 15 5 15L20 40Z" />
                    </svg>
                </div>

                {/* Wheel */}
                <motion.div
                    animate={controls}
                    className="relative w-[300px] h-[300px] rounded-full shadow-2xl border-4 border-white overflow-hidden"
                    style={{
                        boxShadow: '0 0 20px rgba(0,0,0,0.2)'
                    }}
                >
                    <svg viewBox="-150 -150 300 300" className="w-full h-full">
                        {prizes.map((prize, i) => {
                            // Start and end angles in radians
                            const startAngle = (i * segmentAngle * Math.PI) / 180
                            const endAngle = ((i + 1) * segmentAngle * Math.PI) / 180

                            const x1 = Math.cos(startAngle) * radius
                            const y1 = Math.sin(startAngle) * radius
                            const x2 = Math.cos(endAngle) * radius
                            const y2 = Math.sin(endAngle) * radius

                            // SVG Path command
                            const d = [
                                `M 0 0`,
                                `L ${x1} ${y1}`,
                                `A ${radius} ${radius} 0 0 1 ${x2} ${y2}`,
                                `Z`
                            ].join(' ')

                            return (
                                <g key={prize.id}>
                                    <path d={d} fill={prize.color} stroke="white" strokeWidth="2" />
                                    {/* Text Label */}
                                    <g transform={`rotate(${(i * segmentAngle) + (segmentAngle / 2)}, 0, 0) translate(${radius * 0.6}, 0)`}>
                                        <text
                                            x="0"
                                            y="0"
                                            fill={prize.color === '#E2E8F0' || prize.color === '#F1F5F9' || prize.color === '#CBD5E1' ? '#334155' : 'white'}
                                            fontSize="12"
                                            fontWeight="600"
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            transform="rotate(0)" // Keep text readable if needed, or rotate 180 if upside down
                                            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                                        >
                                            {prize.label}
                                        </text>
                                    </g>
                                </g>
                            )
                        })}
                    </svg>
                </motion.div>

                {/* Center Cap */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg z-10 flex items-center justify-center border-2 border-primary">
                    <div className="w-8 h-8 bg-primary rounded-full animate-pulse" />
                </div>
            </div>

            <Button size="lg" onClick={handleSpin} disabled={spinning} className="px-8 text-lg font-bold min-w-[200px]">
                {spinning ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Spinning...
                    </>
                ) : (
                    'SPIN NOW'
                )}
            </Button>

            {/* Locked Overlay */}
            {isLocked && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
                    <div className="bg-card p-6 rounded-xl shadow-lg border text-center space-y-3 max-w-xs mx-4">
                        <div className="text-4xl">🔒</div>
                        <h3 className="font-bold text-xl">Already Spun Today</h3>
                        <p className="text-muted-foreground text-sm">
                            You've used your daily spin. Come back in {formatDistanceToNow(new Date(nextSpinTime!))}!
                        </p>
                        <Button disabled className="w-full">
                            Next Spin: {new Date(nextSpinTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Button>
                    </div>
                </div>
            )}

            <Dialog open={showResult} onOpenChange={(open) => {
                if (!open) resetWheel()
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-2xl text-center">
                            {result?.type === 'loss' ? 'Sorry' : 'Congratulations!'}
                        </DialogTitle>
                        <DialogDescription className="text-center pt-4">
                            {result?.type === 'loss' ? (
                                <span className="text-lg">Sorry, you didn't win. Try again tomorrow!</span>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <span className="text-lg">You won</span>
                                    <span className="text-3xl font-bold py-2 text-primary">{result?.label}</span>
                                    {result?.type === 'reward' && (
                                        <div className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 p-3 rounded-md text-sm border border-amber-200">
                                            ⚠️ Expires in {result?.expiry_hours || 36} hours. Check My Rewards!
                                        </div>
                                    )}
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center">
                        <Button onClick={resetWheel}>
                            Okay, got it!
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </div >
    )
}
