'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, Ticket } from 'lucide-react'
import { CurrentLotteryResponse } from '@/lib/lottery/types'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function LotteryHomeWidget() {
    const { data, isLoading } = useSWR<CurrentLotteryResponse>('/api/lottery/current', fetcher)

    if (isLoading) {
        return (
            <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg">
                <CardContent className="p-4 h-[120px] flex flex-col justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24 bg-white/20" />
                        <Skeleton className="h-8 w-48 bg-white/20" />
                    </div>
                    <Skeleton className="h-6 w-full bg-white/20" />
                </CardContent>
            </Card>
        )
    }

    // Handle no active lottery or error
    if (!data || !data.drawing) {
        return null
    }

    const { drawing, user_entries, time_until_draw } = data

    return (
        <Link href="/lottery">
            <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer overflow-hidden relative">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black/10 rounded-full blur-xl pointer-events-none" />

                <CardContent className="p-4 relative">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-medium opacity-90 uppercase tracking-wider mb-1">Weekly Lottery</p>
                            <h3 className="text-xl font-bold leading-tight">{drawing.prize_description}</h3>
                            <p className="text-[10px] opacity-80 mt-1 font-medium">
                                Enable push notifications to be eligible
                            </p>
                        </div>
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                            <Ticket className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    <div className="mt-4 flex justify-between items-end">
                        <div>
                            <p className="text-xs opacity-80 flex items-center gap-1">
                                Your Entries
                            </p>
                            <p className="text-2xl font-bold">{user_entries.total}</p>
                        </div>

                        <div className="bg-black/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-md">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium whitespace-nowrap">{time_until_draw}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
