'use client'

import { useEffect, useRef } from 'react'
import useSWR from 'swr'
import { mutate } from 'swr'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, Ticket } from 'lucide-react'
import { CurrentLotteryResponse } from '@/lib/lottery/types'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function LotteryHomeWidget() {
    const { data, isLoading } = useSWR<CurrentLotteryResponse>('/api/lottery/current', fetcher)
    const ensuredDrawingRef = useRef<string | null>(null)

    useEffect(() => {
        const drawingId = data?.drawing?.id
        const totalEntries = data?.user_entries?.total || 0

        if (!drawingId || ensuredDrawingRef.current === drawingId || totalEntries > 0) {
            return
        }

        ensuredDrawingRef.current = drawingId

        const ensureBaseEntry = async () => {
            try {
                const res = await fetch('/api/lottery/ensure-base-entry', { method: 'POST' })
                const payload = await res.json()

                if (res.ok && payload?.granted) {
                    await mutate('/api/lottery/current')
                }
            } catch {
                // No-op: current data remains usable and can be retried on next revalidation.
            }
        }

        ensureBaseEntry()
    }, [data?.drawing?.id, data?.user_entries?.total])

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
            <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-[var(--card-shadow)] rounded-[var(--card-radius)] hover:shadow-xl transition-shadow cursor-pointer overflow-hidden relative">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black/10 rounded-full blur-xl pointer-events-none" />

                <CardContent className="p-[var(--card-padding)] relative">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-4">
                            <p className="text-[length:var(--font-size-header)] font-[var(--font-weight-semibold)] opacity-[0.7] tracking-[0.5px] mb-1">Weekly Lottery</p>
                            <h3 className="text-xl font-[var(--font-weight-bold)] leading-[var(--line-height-tight)] break-words">{drawing.prize_description}</h3>
                            <p className="text-[length:var(--font-size-body)] font-[var(--font-weight-regular)] opacity-[0.7] mt-1">
                                Enable push notifications to be eligible
                            </p>
                        </div>
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm flex-shrink-0">
                            <Ticket className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    <div className="mt-4 flex justify-between items-end">
                        <div className="flex-1 min-w-0 pr-2">
                            <p className="text-[length:var(--font-size-body)] font-[var(--font-weight-regular)] opacity-[0.7] flex items-center gap-1">
                                Your Entries
                            </p>
                            <p className="text-2xl font-[var(--font-weight-bold)]">{user_entries.total}</p>
                        </div>

                        <div className="bg-black/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-md flex-shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium whitespace-nowrap">{time_until_draw}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
