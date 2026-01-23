'use client'

import { PointsBalance } from '@/components/features/home/points-balance'
import { QuickActions } from '@/components/features/home/quick-actions'
import { RecentActivity } from '@/components/features/home/recent-activity'
import { SpinWheel } from '@/components/features/gamification/spin-wheel'
import { ReferralCard } from '@/components/features/gamification/referral-card'

export default function Dashboard() {
    return (
        <div className="flex flex-col gap-8 pb-24 p-6 bg-gray-50/50 min-h-screen">
            <div className="space-y-6">
                <PointsBalance />
                <QuickActions />
                <SpinWheel />
                <ReferralCard />
            </div>
            <RecentActivity />
        </div>
    )
}
