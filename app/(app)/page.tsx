'use client'

import { useEffect, useState } from 'react'
import { PointsBalanceBranded as PointsBalance } from '@/components/features/home/points-balance-branded'
// import { PointsBalance } from '@/components/features/home/points-balance' // Original
import { QuickActions } from '@/components/features/home/quick-actions'
import { RecentActivity } from '@/components/features/home/recent-activity'
import { SpinWheel } from '@/components/features/gamification/spin-wheel'
import { ReferralCard } from '@/components/features/gamification/referral-card'
import { NiceTank } from '@/components/nice/nice-tank'
import { NiceBalance } from '@/components/nice/nice-balance'
import { getNiceState, NiceState } from '@/app/actions/nice-actions'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import confetti from 'canvas-confetti'

export default function Dashboard() {
    const [niceState, setNiceState] = useState<NiceState | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    useEffect(() => {
        const loadNiceState = async () => {
            try {
                const state = await getNiceState()
                setNiceState(state)
            } catch (error) {
                console.error('Failed to load nice state:', error)
                setError('Could not load Nice info. Database migration may be missing.')
            } finally {
                setLoading(false)
            }
        }
        loadNiceState()
    }, [refreshTrigger])



    const handleCollect = (amount: number) => {
        if (!niceState) return
        setNiceState({
            ...niceState,
            collectedBalance: niceState.collectedBalance + amount,
            tankNice: 0
        })
    }

    const handleCheckInSuccess = (visitCount: number, multiplier: number) => {
        setRefreshTrigger(prev => prev + 1)

        // Optimistic / Instant update of local state
        if (niceState) {
            setNiceState({
                ...niceState,
                currentMultiplier: multiplier
            })
        }

        // Background refresh to ensure consistency
        const loadNiceState = async () => {
            const state = await getNiceState()
            setNiceState(state)
        }
        loadNiceState()
    }

    const handleSwapSuccess = (pointsGained: number) => {
        setRefreshTrigger(prev => prev + 1)

        // Trigger confetti for the points
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.3 }, // Higher up, closer to where points card usually is
            colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#fbbf24']
        })

        // Also update local nice balance immediately
        if (niceState) {
            setNiceState(prev => prev ? ({
                ...prev,
                collectedBalance: prev.collectedBalance - (pointsGained * 20) // Assuming 20:1 rate
            }) : null)
        }
    }

    return (
        <div className="flex flex-col gap-8 pb-24 p-6 bg-gray-50/50 min-h-screen">
            <div className="space-y-6">
                <PointsBalance refreshTrigger={refreshTrigger} />

                {/* Nice Currency Section */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-24 w-full rounded-xl" />
                            <Skeleton className="h-64 w-full rounded-2xl" />
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm text-center border border-red-100">
                            {error}
                        </div>
                    ) : niceState ? (
                        <>
                            <NiceBalance
                                balance={niceState.collectedBalance}
                                onSwapSuccess={handleSwapSuccess}
                            />
                            <NiceTank initialState={niceState} onCollect={handleCollect} />
                        </>
                    ) : null}
                </div>

                <QuickActions onCheckInSuccess={handleCheckInSuccess} />
                <SpinWheel onSpinSuccess={() => setRefreshTrigger(prev => prev + 1)} />
                <ReferralCard />
            </div>
            <RecentActivity />
        </div>
    )
}
