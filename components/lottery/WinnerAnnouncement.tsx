'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { useEffect } from 'react'

interface WinnerAnnouncementProps {
    winnerName: string
    prizeDescription: string
    voucherCode: string | null
    isCurrentUserWinner: boolean
}

export function WinnerAnnouncement({ winnerName, prizeDescription, voucherCode, isCurrentUserWinner }: WinnerAnnouncementProps) {

    useEffect(() => {
        if (isCurrentUserWinner) {
            const duration = 5 * 1000
            const animationEnd = Date.now() + duration

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now()

                if (timeLeft <= 0) {
                    return clearInterval(interval)
                }

                const particleCount = 50 * (timeLeft / duration)

                confetti({
                    startVelocity: 30,
                    spread: 360,
                    ticks: 60,
                    zIndex: 0,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                })
                confetti({
                    startVelocity: 30,
                    spread: 360,
                    ticks: 60,
                    zIndex: 0,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                })
            }, 250)

            return () => clearInterval(interval)
        }
    }, [isCurrentUserWinner])

    return (
        <Card className={`border-0 shadow-xl overflow-hidden ${isCurrentUserWinner ? 'bg-gradient-to-br from-yellow-300 via-orange-300 to-yellow-500' : 'bg-white'}`}>
            <CardContent className="p-8 text-center space-y-6">
                <div className="text-6xl mb-4">
                    {isCurrentUserWinner ? '🎉' : '🏆'}
                </div>

                <div>
                    <h2 className={`text-3xl font-extrabold mb-2 ${isCurrentUserWinner ? 'text-black' : 'text-gray-900'}`}>
                        {isCurrentUserWinner ? 'CONGRATULATIONS!' : 'WINNER ANNOUNCED!'}
                    </h2>
                    <p className={`text-lg ${isCurrentUserWinner ? 'text-black/80' : 'text-gray-500'}`}>
                        {isCurrentUserWinner ? 'You won the weekly lottery!' : `The winner of the ${prizeDescription} is...`}
                    </p>
                </div>

                <div className="bg-white/30 backdrop-blur-md p-6 rounded-xl border border-white/40">
                    <p className="text-2xl font-bold mb-1">{winnerName}</p>
                    {!isCurrentUserWinner && <p className="text-sm opacity-75">Better luck next time!</p>}
                </div>

                {isCurrentUserWinner && voucherCode && (
                    <div className="bg-black text-white p-4 rounded-lg font-mono text-xl tracking-widest">
                        {voucherCode}
                    </div>
                )}

                <div className="flex justify-center gap-4">
                    <Link href="/lottery">
                        <Button variant={isCurrentUserWinner ? 'default' : 'outline'}>
                            Back to Lottery
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}
