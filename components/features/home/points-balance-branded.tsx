'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useUserProfile } from '@/hooks/use-user-profile'

interface PointsBalanceProps {
    refreshTrigger?: number
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
        <Card className="bg-gradient-to-br from-orange-600 to-red-700 text-white border-none shadow-lg overflow-hidden relative min-h-[220px]">
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

                {/* Nice Work Text - Watermark */}
                <div className="absolute top-6 right-6 opacity-30 pointer-events-none z-0">
                    <span className="text-xl font-medium tracking-tight text-white font-sans">nice work</span>
                </div>

                <CardHeader className="pb-2 relative z-10">
                    <CardTitle className="text-lg font-medium opacity-90">Points Balance</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-5xl font-bold tracking-tight">
                        {profile.points_balance.toLocaleString()}
                    </div>
                    <div className="mt-2 flex justify-between items-center text-sm opacity-90">
                        <span className="capitalize font-medium px-2 py-0.5 bg-white/20 rounded-full text-xs border border-white/10">
                            {profile.tier} Member
                        </span>
                        <span className="font-mono">${profile.total_spent} spent</span>
                    </div>
                    <div className="mt-6">
                        <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider mb-1 opacity-70">
                            <span>Progress to Silver</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-3 bg-black/20" indicatorClassName="bg-white" />
                    </div>

                    {/* Restaurant Logos */}
                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                        <span className="text-[10px] text-orange-100 uppercase tracking-wider font-semibold">Participating Outlets</span>
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-1.5 rounded-lg shadow-sm transform hover:scale-105 transition-transform duration-200">
                                <img
                                    src="/images/logos/tanuki-raw-logo.png"
                                    alt="Tanuki Raw"
                                    className="h-6 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300 opacity-80 hover:opacity-100"
                                />
                            </div>
                            <div className="bg-white p-1.5 rounded-lg shadow-sm transform hover:scale-105 transition-transform duration-200">
                                <img
                                    src="/images/logos/standing-sushi-bar-logo.png"
                                    alt="Standing Sushi Bar"
                                    className="h-6 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300 opacity-80 hover:opacity-100"
                                />
                            </div>
                        </div>
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
        <Card className="bg-gradient-to-br from-orange-600 to-red-700 border-none shadow-lg h-[200px] animate-pulse">
            <CardContent className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </CardContent>
        </Card>
    )
}
