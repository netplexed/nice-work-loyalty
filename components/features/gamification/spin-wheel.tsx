'use client'

import { useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import confetti from 'canvas-confetti'
import { SpinPrize, spin } from '@/app/actions/spin-actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SpinWheelProps {
    prizes: SpinPrize[]
    onSpinComplete?: () => void
}

export function SpinWheel({ prizes, onSpinComplete }: SpinWheelProps) {
    const [spinning, setSpinning] = useState(false)
    const [result, setResult] = useState<SpinPrize | null>(null)
    const [showResult, setShowResult] = useState(false)
    const controls = useAnimation()

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

            // Add 5 full rotations (1800 deg) for effect
            const baseRotation = 1800
            const targetRotation = baseRotation - 90 - (prizeIndex * segmentAngle + segmentAngle / 2) + jitter

            await controls.start({
                rotate: targetRotation,
                transition: {
                    duration: 5,
                    ease: [0.2, 0.8, 0.2, 1], // Cubic bezier for ease-out
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
        controls.set({ rotate: 0 })
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
        <div className="flex flex-col items-center justify-center space-y-8 py-8">
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

            <Dialog open={showResult} onOpenChange={(open) => {
                if (!open) resetWheel()
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-2xl text-center">
                            {result?.type === 'loss' ? 'Oh no!' : 'Congratulations!'}
                        </DialogTitle>
                        <DialogDescription className="text-center pt-4">
                            {result?.type === 'loss' ? (
                                <span className="text-lg">Better luck next time!</span>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <span className="text-lg">You won</span>
                                    <span className="text-3xl font-bold py-2 text-primary">{result?.label}</span>
                                    {result?.type === 'reward' && (
                                        <div className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 p-3 rounded-md text-sm border border-amber-200">
                                            ⚠️ Expires in 36 hours. Check My Rewards!
                                        </div>
                                    )}
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center">
                        <Button onClick={() => setShowResult(false)}>
                            Okay, got it!
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
