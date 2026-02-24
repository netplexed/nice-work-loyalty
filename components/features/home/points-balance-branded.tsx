'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useUserProfile } from '@/hooks/use-user-profile'
import { InfoModal } from '@/components/ui/info-modal'

interface PointsBalanceProps {
    refreshTrigger?: number
}

const TIER_NAMES: Record<string, string> = {
    'bronze': 'Hi My Name Is',
    'silver': 'Good to See You',
    'gold': 'Local Legend',
    'platinum': 'Platinum'
}

export function PointsBalanceBranded({ refreshTrigger = 0 }: PointsBalanceProps) {
    const { profile, loading, mutate } = useUserProfile()

    // Trigger re-fetch when parent asks
    useEffect(() => {
        if (refreshTrigger > 0) mutate()
    }, [refreshTrigger, mutate])

    if (loading && !profile) {
        return <PointsSkeleton />
    }

    if (!profile || profile?.error) {
        // Show skeleton or error state
        return <PointsSkeleton />
    }

    const progress = Math.min((profile.total_spent / 1500) * 100, 100)

    return (
        <Card className="bg-gradient-to-br from-orange-600 to-red-700 text-white border-none shadow-[var(--card-shadow)] rounded-[var(--card-radius)] overflow-hidden relative min-h-[160px]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Brand Pattern Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                    backgroundSize: '24px 24px'
                }}></div>

                {/* Top Right Branding & Logos */}
                <div className="absolute top-6 right-6 flex flex-col items-end gap-2 z-10 pointer-events-none">
                    <span className="text-xl font-medium tracking-tight text-white/40 font-brand">nice work</span>
                    <div className="flex items-center gap-1.5 pointer-events-auto mt-1">
                        <div className="bg-white p-1 rounded-md shadow-sm transform hover:scale-105 transition-transform duration-200">
                            <img
                                src="/images/logos/tanuki-raw-logo.png"
                                alt="Tanuki Raw"
                                className="h-4 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300 opacity-80 hover:opacity-100"
                            />
                        </div>
                        <div className="bg-white p-1 rounded-md shadow-sm transform hover:scale-105 transition-transform duration-200">
                            <img
                                src="/images/logos/standing-sushi-bar-logo.png"
                                alt="Standing Sushi Bar"
                                className="h-4 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300 opacity-80 hover:opacity-100"
                            />
                        </div>
                    </div>
                </div>

                <CardHeader className="pb-2 relative z-10 px-[var(--card-padding)] pt-[var(--card-padding)]">
                    <CardTitle className="text-[length:var(--font-size-header)] font-[var(--font-weight-semibold)] tracking-[0.5px] opacity-[0.9] flex items-center text-white">
                        <span className="opacity-90">Points Balance</span>
                        <InfoModal
                            title="Points Balance"
                            description="Earn 5 points for every dollar you spend at Tanuki Raw and Standing Sushi Bar. Points can be redeemed for rewards whenever you're ready. The more you dine, the more you earn!"
                            className="text-white/70 hover:text-white"
                        />
                    </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 px-[var(--card-padding)] pb-[var(--card-padding)]">
                    <div className="text-[length:var(--font-size-display)] font-[var(--font-weight-bold)] leading-[var(--line-height-tight)]">
                        {profile.points_balance.toLocaleString()}
                    </div>
                    <div className="mt-2 flex justify-between items-center text-[length:var(--font-size-body)] font-[var(--font-weight-regular)] opacity-[0.9] text-white">
                        <span className="capitalize font-medium pl-3 pr-2 py-0.5 bg-white/20 rounded-full text-xs border border-white/10 flex items-center">
                            {TIER_NAMES[profile.tier] || profile.tier}
                            <InfoModal
                                title="Membership Tiers"
                                description="Progress through three tiers as you dine with us: Hi My Name Is → Good to See You → Local Legend. Higher tiers unlock faster nice generation, so you earn rewards quicker just for being a loyal friend of ours."
                                className="text-white/70 hover:text-white w-5 h-5 -mr-1 ml-1.5"
                            />
                        </span>
                    </div>
                    <div className="mt-6">
                        <div className="flex justify-between text-[length:var(--font-size-small)] font-[var(--font-weight-semibold)] mb-1 opacity-[0.7]">
                            <span>Progress to Good to See You</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-3 bg-black/20" indicatorClassName="bg-white" />
                    </div>

                </CardContent>

                {/* Decorative background circles */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl z-0" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-orange-500/20 rounded-full blur-2xl z-0" />
            </motion.div>
        </Card>
    )
}

function PointsSkeleton() {
    return (
        <Card className="bg-gradient-to-br from-orange-600 to-red-700 border-none shadow-lg h-[160px] animate-pulse">
            <CardContent className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </CardContent>
        </Card>
    )
}
