'use client'

import { useState, useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { canSpinToday, spinWheel } from '@/app/actions/game-actions'
import { Loader2, Gift } from 'lucide-react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

export function SpinWheel() {
    const [canSpin, setCanSpin] = useState(false)
    const [spinning, setSpinning] = useState(false)
    const [loading, setLoading] = useState(true)
    const controls = useAnimation()

    useEffect(() => {
        checkEligibility()
    }, [])

    const checkEligibility = async () => {
        try {
            const eligible = await canSpinToday()
            setCanSpin(eligible)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleSpin = async () => {
        if (!canSpin || spinning) return

        setSpinning(true)

        // Start spinning animation (indefinite until result comes back)
        controls.start({
            rotate: 360 * 5,
            transition: { duration: 2, ease: "linear", repeat: Infinity }
        })

        try {
            // Call server to get result
            const prize = await spinWheel()

            // Stop infinite spin
            controls.stop()

            // Calculate landing angle based on prize value (Visual only, simple mapping)
            // simplified mapping for demo:
            // 50 -> 45deg
            // 100 -> 135deg
            // 500 -> 225deg
            // 1000 -> 315deg
            let targetAngle = 0
            if (prize.value === 50) targetAngle = 45 + 360 * 3
            else if (prize.value === 100) targetAngle = 135 + 360 * 3
            else if (prize.value === 500) targetAngle = 225 + 360 * 3
            else targetAngle = 315 + 360 * 3 // Jackpot

            // Animate to result
            await controls.start({
                rotate: targetAngle,
                transition: { duration: 3, ease: "easeOut" }
            })

            if (prize.value >= 500) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                })
            }

            toast.success(`You won: ${prize.description}!`)
            setCanSpin(false) // Update local state immediately

        } catch (error: any) {
            toast.error(error.message || 'Failed to spin')
            controls.stop()
        } finally {
            setSpinning(false)
        }
    }

    if (loading) return null

    if (!canSpin && !spinning) {
        return (
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                    <Gift className="w-8 h-8 text-indigo-400 opacity-50" />
                    <p className="text-sm text-muted-foreground font-medium">Come back tomorrow for your next spin!</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="overflow-hidden border-2 border-indigo-100 shadow-xl bg-white relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">Daily Spin</CardTitle>
                <CardDescription>Spin for a chance to win up to 1000 points!</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center p-6 pt-2">
                <div className="relative w-64 h-64 mb-6">
                    {/* Wheel Graphic */}
                    <motion.div
                        className="w-full h-full rounded-full border-4 border-indigo-500 shadow-2xl relative bg-white overflow-hidden"
                        animate={controls}
                        style={{
                            background: 'conic-gradient(#e0e7ff 0deg 90deg, #c7d2fe 90deg 180deg, #a5b4fc 180deg 270deg, #818cf8 270deg 360deg)'
                        }}
                    >
                        {/* Segments Text - simplified positioning */}
                        <div className="absolute top-8 right-8 text-xs font-bold text-indigo-900 rotate-45">50</div>
                        <div className="absolute bottom-8 right-8 text-xs font-bold text-indigo-900 rotate-[135deg]">100</div>
                        <div className="absolute bottom-8 left-8 text-xs font-bold text-indigo-900 rotate-[225deg]">500</div>
                        <div className="absolute top-8 left-8 text-xs font-bold text-indigo-900 rotate-[315deg]">1000</div>
                    </motion.div>

                    {/* Pointer */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 z-10">
                        <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-red-500 drop-shadow-md" />
                    </div>
                </div>

                <Button
                    size="lg"
                    onClick={handleSpin}
                    disabled={spinning || !canSpin}
                    className="w-full max-w-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-md transition-all hover:scale-105"
                >
                    {spinning ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Spinning...
                        </>
                    ) : (
                        'SPIN NOW'
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}
