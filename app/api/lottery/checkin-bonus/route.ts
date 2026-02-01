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

        // Award Bonus
        const result = await service.awardCheckinBonus(user.id, drawing.id)

        return NextResponse.json(result)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
