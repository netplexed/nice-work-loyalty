'use client'

import useSWR from 'swr'
import { useParams } from 'next/navigation'
import { useNiceTank } from '@/hooks/use-nice-tank' // To check if current user matches winner
import { WinnerAnnouncement } from '@/components/lottery/WinnerAnnouncement' // Reuse component
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client' // Need client to get user ID if niceTank doesn't have it explicitly

// Fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function WinnerPage() {
    const params = useParams()
    const drawingId = params.drawing_id as string

    // Fetch winners to find the one for this drawing
    // Ideally we would have an endpoint for specific drawing, but we can reuse /api/lottery/winners?drawing_id=...
    // Wait, I didn't implement filtering by drawing_id in winners endpoint. 
    // But I implemented GET /api/lottery/winners linked to a limit.
    // I should probably just fetch the drawing details directly or assume we can find it.
    // Let's use a new fetcher logic or just query supabase directly here for simplicity?
    // Or I can add drawing_id filter to my API.
    // I'll add query support to /api/lottery/winners later if needed, but for now I'll just use a direct select via client for this specific page 
    // to be sure we get the right data without modifying API again.

    // Actually, I'll update the fetcher to use a direct Supabase query for this specific page logic 
    // because it's a specific "show me the result of this drawing" page.

    const { data, isLoading } = useSWR(['winner-drawing', drawingId], async () => {
        const supabase = createClient()
        const { data: winner } = await supabase
            .from('lottery_winners')
            .select(`
            *,
            profiles (username, full_name, avatar_url)
        `)
            .eq('drawing_id', drawingId)
            .single()

        const { data: user } = await supabase.auth.getUser()

        return { winner, currentUser: user.user }
    })

    if (isLoading) {
        return <div className="p-8 container max-w-2xl mx-auto flex items-center justify-center min-h-[50vh]">
            <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
    }

    if (!data?.winner) {
        return <div className="p-8 text-center">
            <h1 className="text-2xl font-bold">Drawing still in progress or not found.</h1>
        </div>
    }

    const { winner, currentUser } = data
    const isMe = currentUser?.id === winner.user_id
    const name = winner.profiles?.username || winner.profiles?.full_name || 'Anonymous'

    return (
        <div className="container max-w-2xl mx-auto p-4 py-12">
            <WinnerAnnouncement
                winnerName={name}
                prizeDescription={winner.prize_description}
                voucherCode={isMe ? winner.voucher_code : null}
                isCurrentUserWinner={isMe}
            />
        </div>
    )
}
