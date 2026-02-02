'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useNiceTank } from '@/hooks/use-nice-tank'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { LotteryPurchaseModal } from '@/components/lottery/LotteryPurchaseModal'
import { CurrentLotteryResponse, LotteryWinner } from '@/lib/lottery/types'
import { Trophy, Clock, Ticket, AlertCircle, Sparkles } from 'lucide-react'

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function LotteryPage() {
    const { niceState, loading: niceLoading } = useNiceTank()

    const { data: currentData, isLoading: currentLoading } = useSWR<CurrentLotteryResponse>('/api/lottery/current', fetcher)
    const { data: winnersData, isLoading: winnersLoading } = useSWR<{ winners: LotteryWinner[] }>('/api/lottery/winners', fetcher)

    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)

    if (currentLoading || niceLoading) {
        return <div className="p-8 space-y-4">
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <Skeleton className="h-[100px] w-full rounded-xl" />
            <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
    }

    const drawing = currentData?.drawing
    const userEntries = currentData?.user_entries
    const remaining = currentData?.remaining

    return (
        <div className="container max-w-4xl mx-auto p-4 space-y-8 pb-20">

            {/* Header / Hero */}
            <div className="space-y-2 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Weekly Lottery</h1>
                <p className="text-muted-foreground text-lg">Use your Nice to win real dining vouchers.</p>
            </div>

            {drawing ? (
                <Card className="border-0 shadow-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white overflow-hidden relative">
                    {/* Shapes for aesthetic */}
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/10 rounded-full blur-3xl" />

                    <CardContent className="p-8 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-8 items-center">
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                                    <Clock className="w-4 h-4" />
                                    <span>Draws in {currentData.time_until_draw}</span>
                                </div>
                                <h2 className="text-4xl sm:text-5xl font-black leading-none">{drawing.prize_description}</h2>
                                <p className="text-lg opacity-90">
                                    Prize Value: ${drawing.prize_value}
                                </p>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6  border border-white/20 space-y-4">
                                <div className="flex justify-between items-center text-sm font-medium opacity-80">
                                    <span>Your Total Entries</span>
                                </div>
                                <div className="text-5xl lg:text-6xl font-black tracking-tighter text-center">
                                    {userEntries?.total || 0}
                                </div>
                                <Button
                                    size="lg"
                                    className="w-full bg-white text-purple-600 hover:bg-white/90 font-bold text-lg h-auto py-3 whitespace-normal shadow-sm"
                                    onClick={() => setIsPurchaseModalOpen(true)}
                                    disabled={remaining?.can_purchase === 0 && (niceState?.collectedBalance || 0) < 200}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <Ticket className="shrink-0 h-5 w-5" />
                                        <span>Get More Entries</span>
                                    </div>
                                </Button>
                                <div className="text-center text-xs opacity-70">
                                    You can buy {remaining?.can_purchase} more this week
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Alert variant="default" className="border-purple-200 bg-purple-50">
                    <AlertCircle className="h-4 w-4 text-purple-600" />
                    <AlertTitle>No Active Drawing</AlertTitle>
                    <AlertDescription>
                        The lottery is currently closed. Check back next Monday for the new drawing!
                    </AlertDescription>
                </Alert>
            )}

            {/* Stats / Info */}
            <div className="grid md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold">Visit Bonus</h3>
                        <p className="text-sm text-muted-foreground mt-1">Get +1 entry for every restaurant visit (up to 3/week).</p>
                        <div className="mt-2 text-xs font-medium bg-secondary px-2 py-1 rounded">
                            {userEntries?.breakdown?.visit || 0} Earned
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                            <Ticket className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold">Purchase</h3>
                        <p className="text-sm text-muted-foreground mt-1">Buy entries with Nice. 200 Nice per entry (max 10/week).</p>
                        <div className="mt-2 text-xs font-medium bg-secondary px-2 py-1 rounded">
                            {userEntries?.breakdown?.purchased || 0} Purchased
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-3">
                            <Clock className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold">Check-in</h3>
                        <p className="text-sm text-muted-foreground mt-1">Check-in weekly via the app for +2 entries bonus.</p>
                        <div className="mt-2 text-xs font-medium bg-secondary px-2 py-1 rounded">
                            {userEntries?.breakdown?.checkin ? 'Unlocked' : 'Locked'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Past Winners */}
            <div className="space-y-4">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Trophy className="text-yellow-500" />
                    Recent Winners
                </h3>

                <div className="grid gap-3">
                    {winnersLoading ? (
                        <Skeleton className="h-16 w-full" />
                    ) : winnersData?.winners && winnersData.winners.length > 0 ? (
                        winnersData.winners.map((winner) => (
                            <Card key={winner.id} className="overflow-hidden hover:bg-muted/30 transition-colors">
                                <div className="flex items-center p-4">
                                    <div className="h-10 w-10 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center font-bold text-white shadow-sm shrink-0">
                                        {(winner.user_name || 'A').charAt(0)}
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <p className="font-bold">{winner.user_name || 'Anonymous'}</p>
                                        <p className="text-sm text-muted-foreground">Won {winner.prize_description}</p>
                                    </div>
                                    <div className="text-right text-xs text-muted-foreground hidden sm:block">
                                        {winner.draw_date ? new Date(winner.draw_date).toLocaleDateString() : ''}
                                    </div>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <p className="text-muted-foreground">No winners yet. Be the first!</p>
                    )}
                </div>
            </div>

            {/* Purchase Modal */}
            {drawing && (
                <LotteryPurchaseModal
                    open={isPurchaseModalOpen}
                    onOpenChange={setIsPurchaseModalOpen}
                    niceBalance={niceState?.collectedBalance || 0}
                    drawingId={drawing.id}
                    canPurchase={remaining?.can_purchase || 0}
                />
            )}
        </div>
    )
}
