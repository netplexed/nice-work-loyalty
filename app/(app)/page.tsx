'use client'

import { useState } from 'react'
import { mutate as globalMutate } from 'swr'
import { PointsBalanceBranded as PointsBalance } from '@/components/features/home/points-balance-branded'
import { NewsCarousel } from '@/components/features/home/news-carousel'
import { NiceTank } from '@/components/nice/nice-tank'
import { NiceBalance } from '@/components/nice/nice-balance'
import { Skeleton } from '@/components/ui/skeleton'
import confetti from 'canvas-confetti'
import { useNiceTank } from '@/hooks/use-nice-tank'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

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
import { LotteryHomeWidget } from '@/components/lottery/LotteryHomeWidget'
import { InfoModal } from '@/components/ui/info-modal'

export default function Dashboard() {
    const { niceState, loading, error, mutate } = useNiceTank()
    const { prizes: spinConfig, nextSpinTime, mutateStatus } = useSpinWheel()

    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const { scrollY } = useScroll()
    const chevronOpacity = useTransform(scrollY, [0, 100], [1, 0])

    const handleCollect = (amount: number) => {
        if (!niceState) return

        // Optimistic update of the Global SWR Cache
        mutate({
            ...niceState,
            collectedBalance: niceState.collectedBalance + amount,
            tankNice: 0
        }, false) // false = update local data immediately, don't re-fetch from server yet
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

        // Global cache invalidation for Recent Activity
        globalMutate('recent-activity-5')
    }

    return (
        <div className="flex flex-col gap-8 pb-24 p-6 bg-gray-50/50 min-h-screen">
            <div className="space-y-6">
                <PointsBalance refreshTrigger={refreshTrigger} />

                {/* Nice Currency Section */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-64 w-full rounded-2xl" />
                            <Skeleton className="h-24 w-full rounded-xl" />
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm text-center border border-red-100">
                            Could not load Nice info.
                        </div>
                    ) : niceState ? (
                        <>
                            <NiceTank initialState={niceState} onCollect={handleCollect} />
                            <NiceBalance
                                balance={niceState.collectedBalance}
                                onSwapSuccess={handleSwapSuccess}
                            />
                        </>
                    ) : null}
                </div>

                <NewsCarousel />

                {/* Weighted slightly higher than news, below balanced/tank */}
                <LotteryHomeWidget />

                {spinConfig.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
                        <div className="flex justify-center items-center mb-4 ml-8"> {/* ml-8 to offset the modal button and truly center */}
                            <h3 className="font-semibold text-center m-0 p-0">Daily Spin</h3>
                            <InfoModal
                                title="Daily Spin"
                                description="Spin the wheel once every day for a chance to win instant prizes like vouchers and bonus points. Make it part of your daily routine and see what you score today!"
                                className="ml-1 -mr-9" // adjust to keep the text centered
                            />
                        </div>
                        <SpinWheel
                            prizes={spinConfig}
                            nextSpinTime={nextSpinTime}
                            onSpinComplete={() => {
                                setRefreshTrigger(prev => prev + 1)
                                mutateStatus() // Revalidate spin status
                                globalMutate('recent-activity-5') // Revalidate activity feed
                            }}
                        />
                    </div>
                )}
                <ReferralCard />
            </div>
            <RecentActivity />

            {/* Scroll Indicator Chevron */}
            <motion.div
                className="fixed bottom-24 left-1/2 -translate-x-1/2 pointer-events-none z-50 flex flex-col items-center gap-1"
                style={{ opacity: chevronOpacity }}
                initial={{ y: -10 }}
                animate={{ y: 0 }}
                transition={{
                    repeat: Infinity,
                    repeatType: "reverse",
                    duration: 1,
                    ease: "easeInOut"
                }}
            >
                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-2 rounded-full shadow-md text-amber-500 border border-gray-100 dark:border-zinc-800">
                    <ChevronDown size={24} />
                </div>
            </motion.div>
        </div>
    )
}
