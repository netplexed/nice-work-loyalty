'use client'

import { useState } from 'react'
import { PointsBalanceBranded as PointsBalance } from '@/components/features/home/points-balance-branded'
import { NewsCarousel } from '@/components/features/home/news-carousel'
import { QuickActions } from '@/components/features/home/quick-actions'
import { NiceTank } from '@/components/nice/nice-tank'
import { NiceBalance } from '@/components/nice/nice-balance'
import { Skeleton } from '@/components/ui/skeleton'
import confetti from 'canvas-confetti'
import { useNiceTank } from '@/hooks/use-nice-tank'

// Lazy load below-the-fold components
import dynamic from 'next/dynamic'

const SpinWheel = dynamic(() => import('@/components/features/gamification/spin-wheel').then(mod => mod.SpinWheel), {
    loading: () => <Skeleton className="h-48 w-full rounded-xl" />
})

const ReferralCard = dynamic(() => import('@/components/features/gamification/referral-card').then(mod => mod.ReferralCard), {
    loading: () => <Skeleton className="h-32 w-full rounded-xl" />
})

const RecentActivity = dynamic(() => import('@/components/features/home/recent-activity').then(mod => mod.RecentActivity), {
    loading: () => <Skeleton className="h-64 w-full rounded-xl" />
})
import { useSpinWheel } from '@/hooks/use-spin-wheel'
import { resetDailySpin } from '@/app/actions/debug-actions'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { LotteryHomeWidget } from '@/components/lottery/LotteryHomeWidget'

export default function Dashboard() {
    const { niceState, loading, error, mutate } = useNiceTank()
    const { prizes: spinConfig, nextSpinTime, mutateStatus, loading: spinLoading } = useSpinWheel()

    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const handleCollect = (amount: number) => {
        if (!niceState) return

        // Optimistic update of the Global SWR Cache
        mutate({
            ...niceState,
            collectedBalance: niceState.collectedBalance + amount,
            tankNice: 0
        }, false) // false = update local data immediately, don't re-fetch from server yet
    }

    const handleCheckInSuccess = (visitCount: number, multiplier: number) => {
        setRefreshTrigger(prev => prev + 1)

        if (niceState) {
            mutate({
                ...niceState,
                currentMultiplier: multiplier
            }, false)
        }

        // Re-validate in background
        mutate()
    }

    const handleSwapSuccess = (pointsGained: number) => {
        setRefreshTrigger(prev => prev + 1)

        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.3 },
            colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#fbbf24']
        })

        if (niceState) {
            mutate({
                ...niceState,
                collectedBalance: niceState.collectedBalance - (pointsGained * 20), // Approx
            }) // Validate with server immediately to get exact new balance
        }
    }

    const handleDebugReset = async () => {
        try {
            await resetDailySpin()
            await mutateStatus()
            toast.success('Debug: Spin reset successful')
        } catch (e) {
            toast.error('Debug: Failed to reset')
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
                            Could not load Nice info.
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

                {/* Weighted slightly higher than news, below balanced/tank */}
                <LotteryHomeWidget />

                <NewsCarousel />

                <QuickActions onCheckInSuccess={handleCheckInSuccess} />

                {spinConfig.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
                        <h3 className="font-semibold mb-4 text-center">Daily Spin</h3>
                        <SpinWheel
                            prizes={spinConfig}
                            nextSpinTime={nextSpinTime}
                            onSpinComplete={() => {
                                setRefreshTrigger(prev => prev + 1)
                                mutateStatus() // Revalidate spin status
                            }}
                        />


                        {/* Debug Tool */}
                        <div className="mt-4 pt-4 border-t border-dashed flex justify-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground hover:text-destructive h-8 gap-1"
                                onClick={handleDebugReset}
                            >
                                <RotateCcw className="w-3 h-3" />
                                Reset Spin (Debug)
                            </Button>
                        </div>
                    </div>
                )}
                <ReferralCard />
            </div>
            <RecentActivity />
        </div>
    )
}
