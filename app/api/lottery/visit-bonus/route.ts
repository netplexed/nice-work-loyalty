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
        const { visit_id } = await req.json()

        if (!visit_id) {
            return NextResponse.json({ error: 'Visit ID is required' }, { status: 400 })
        }

        const service = new LotteryService(supabase)

        // Get active drawing
        const drawing = await service.getCurrentDrawing()
        if (!drawing) {
            return NextResponse.json({ error: 'No active lottery drawing' }, { status: 404 })
        }

        // Validate that the submitted "visit_id" maps to a real purchase
        // for the authenticated user inside the active drawing window.
        const { data: visit } = await supabase
            .from('purchases')
            .select('id, user_id, created_at')
            .eq('id', visit_id)
            .eq('user_id', user.id)
            .gte('created_at', new Date(drawing.week_start_date).toISOString())
            .maybeSingle()

        if (!visit) {
            return NextResponse.json({ error: 'Invalid visit record' }, { status: 400 })
        }

        const result = await service.awardVisitBonus(user.id, visit_id, drawing.id)

        if (!result.success) {
            // Not 400 because it might be just "already awarded" which is success=false but valid request
            return NextResponse.json(result)
        }

        return NextResponse.json(result)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unexpected error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
