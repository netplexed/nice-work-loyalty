import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { LotteryService } from '@/lib/lottery/service'

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { location_id } = await req.json()

        // We could validate location_id here if needed
        if (!location_id) {
            return NextResponse.json({ error: 'Location ID is required' }, { status: 400 })
        }

        const service = new LotteryService(supabase)

        // Get active drawing
        const drawing = await service.getCurrentDrawing()
        if (!drawing) {
            return NextResponse.json({ error: 'No active lottery drawing' }, { status: 404 })
        }

        // Require at least one real purchase visit at this location
        // within the active drawing window.
        const { data: checkIn } = await supabase
            .from('purchases')
            .select('id')
            .eq('user_id', user.id)
            .eq('location', location_id)
            .gte('created_at', new Date(drawing.week_start_date).toISOString())
            .maybeSingle()

        if (!checkIn) {
            return NextResponse.json({ error: 'No eligible visit found for this location' }, { status: 400 })
        }

        // Award Bonus
        const result = await service.awardCheckinBonus(user.id, drawing.id)

        return NextResponse.json(result)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unexpected error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
