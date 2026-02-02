import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    // 1. Get ALL drawings (active and upcoming)
    const { data: drawings } = await supabase
        .from('lottery_drawings')
        .select('*')
        .order('draw_date', { ascending: true })

    // 2. Get user entries for ANY drawing
    const { data: entries } = await supabase
        .from('lottery_entries')
        .select('*')
        .eq('user_id', user.id)

    return NextResponse.json({
        user_id: user.id,
        drawings,
        user_entries: entries,
        analysis: entries?.map(e => {
            const drawing = drawings?.find(d => d.id === e.drawing_id)
            return {
                entry_id: e.id,
                drawing_id: e.drawing_id,
                quantity: e.quantity,
                drawing_status: drawing?.status,
                drawing_date: drawing?.draw_date
            }
        })
    })
}
