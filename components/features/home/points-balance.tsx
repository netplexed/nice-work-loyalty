'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getUserProfile } from '@/app/actions/user-actions'

interface PointsBalanceProps {
    refreshTrigger?: number
}

const TIER_NAMES: Record<string, string> = {
    'bronze': 'Hi My Name Is',
    'silver': 'Good to See You',
    'gold': 'Local Legend',
    'platinum': 'Platinum'
}

export function PointsBalance({ refreshTrigger = 0 }: PointsBalanceProps) {
    const [profile, setProfile] = useState<any>(null)

    useEffect(() => {
        getUserProfile()
            .then(setProfile)
            .catch(err => {
                console.error(err)
                setProfile({ error: true, message: err.message })
            })
    }, [refreshTrigger])

    if (profile?.error) {
        return (
            <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-red-600 text-xs break-all">
                    <strong>Error:</strong> {profile.message}
                </CardContent>
            </Card>
        )
    }

    if (!profile) {
        return <PointsSkeleton />
    }

    // Actually tier is based on visits/spent, but let's show visual progress roughly
    const progress = Math.min((profile.total_spent / 1500) * 100, 100)

    return (
        <Card className="bg-gradient-to-br from-blue-700 to-blue-900 text-white border-none shadow-[var(--card-shadow)] rounded-[var(--card-radius)] overflow-hidden relative min-h-[220px]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Nice Work Text - Watermark style top right */}
                <div className="absolute top-6 right-6 opacity-30 pointer-events-none z-0">
                    <span className="text-xl font-medium tracking-tight text-white font-brand">nice work</span>
                </div>

                <CardHeader className="pb-2 relative z-10 px-[var(--card-padding)] pt-[var(--card-padding)]">
                    <CardTitle className="text-[length:var(--font-size-header)] font-[var(--font-weight-semibold)] tracking-[0.5px] opacity-[0.7]">Points Balance</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 px-[var(--card-padding)] pb-[var(--card-padding)]">
                    <div className="text-[length:var(--font-size-display)] font-[var(--font-weight-bold)] leading-[var(--line-height-tight)]">
                        {profile.points_balance.toLocaleString()}
                    </div>
                    <div className="mt-2 flex justify-between items-center text-[length:var(--font-size-body)] font-[var(--font-weight-regular)] opacity-[0.7]">
                        <span className="capitalize">{TIER_NAMES[profile.tier] || profile.tier}</span>
                        <span>${profile.total_spent} spent</span>
                    </div>
                    <div className="mt-4">
                        <Progress value={progress} className="h-2 bg-blue-950/30" indicatorClassName="bg-yellow-400" />
                        <p className="text-[length:var(--font-size-small)] mt-1 text-right opacity-[0.7]">
                            {1500 - profile.total_spent > 0
                                ? `$${1500 - profile.total_spent} to Good to See You`
                                : 'Tier Maxed!'}
                        </p>
                    </div>

                    {/* Restaurant Logos */}
                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-4 opacity-100">
                        <span className="text-[length:var(--font-size-header)] font-[var(--font-weight-semibold)] tracking-[0.5px] opacity-[0.7]">Participating Outlets</span>
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-1 rounded-md shadow-sm">
                                <img
                                    src="/images/logos/tanuki-raw-logo.png"
                                    alt="Tanuki Raw"
                                    className="h-8 w-auto object-contain"
                                />
                            </div>
                            <div className="bg-white p-1 rounded-md shadow-sm">
                                <img
                                    src="/images/logos/standing-sushi-bar-logo.png"
                                    alt="Standing Sushi Bar"
                                    className="h-8 w-auto object-contain"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>

                {/* Decorative background circles */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-2xl z-0" />
                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl z-0" />
            </motion.div>
        </Card>
    )
}

function PointsSkeleton() {
    return (
        <Card className="bg-gradient-to-br from-blue-700 to-blue-900 border-none shadow-lg h-[200px] animate-pulse">
            <CardContent className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </CardContent>
        </Card>
    )
}
