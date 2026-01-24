'use client'

import { useEffect, useState } from 'react'
import { PointsBalance } from '@/components/features/home/points-balance'
import { QuickActions } from '@/components/features/home/quick-actions'
import { RecentActivity } from '@/components/features/home/recent-activity'
import { SpinWheel } from '@/components/features/gamification/spin-wheel'
import { ReferralCard } from '@/components/features/gamification/referral-card'
import { NiceTank } from '@/components/nice/nice-tank'
import { NiceBalance } from '@/components/nice/nice-balance'
import { getNiceState, NiceState } from '@/app/actions/nice-actions'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

export default function Dashboard() {
    const [niceState, setNiceState] = useState<NiceState | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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
    }, [])

    const handleCollect = (amount: number) => {
        if (!niceState) return
        setNiceState({
            ...niceState,
            collectedBalance: niceState.collectedBalance + amount,
            tankNice: 0
        })
    }

    return (
        <div className="flex flex-col gap-8 pb-24 p-6 bg-gray-50/50 min-h-screen">
            <div className="space-y-6">
                <PointsBalance />

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
                            <NiceBalance balance={niceState.collectedBalance} />
                            <NiceTank initialState={niceState} onCollect={handleCollect} />
                        </>
                    ) : null}
                </div>

                <QuickActions />
                <SpinWheel />
                <ReferralCard />
            </div>
            <RecentActivity />
        </div>
    )
}
