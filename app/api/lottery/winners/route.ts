import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const { data: winners, error } = await supabase
        .from('lottery_winners')
        .select(`
        *,
        lottery_drawings!inner (
            draw_date,
            total_entries,
            total_participants
        ),
        profiles (
            username,
            full_name,
            avatar_url
        )
    `)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Map to clean response
    const formattedWinners = winners.map((w: any) => ({
        id: w.id,
        user_name: w.profiles?.username || w.profiles?.full_name || 'Anonymous User',
        user_avatar: w.profiles?.avatar_url,
        prize_description: w.prize_description,
        prize_value: w.prize_value,
        draw_date: w.lottery_drawings?.draw_date,
        total_entries_in_pool: w.lottery_drawings?.total_entries,
        winning_ticket_number: w.lottery_drawings?.winning_ticket_number
    }))

    return NextResponse.json({ winners: formattedWinners })
}
