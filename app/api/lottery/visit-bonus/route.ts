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

        // Award Bonus
        // Verify visit ownership logic should ideally happen here or in RPC.
        // For now, we trust the client or assume the RPC checks visit validity if linked?
        // RPC `award_lottery_visit_bonus` checks if entry exists for this visit_id.
        // It does NOT verify if visit_id belongs to user in the RPC (I missed that check).
        // I should probably check that visit belongs to user here.

        const { data: visit } = await supabase
            .from('visits')
            .select('user_id')
            .eq('id', visit_id)
            .single()

        if (!visit || visit.user_id !== user.id) {
            return NextResponse.json({ error: 'Invalid visit record' }, { status: 400 })
        }

        const result = await service.awardVisitBonus(user.id, visit_id, drawing.id)

        if (!result.success) {
            // Not 400 because it might be just "already awarded" which is success=false but valid request
            return NextResponse.json(result)
        }

        return NextResponse.json(result)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
