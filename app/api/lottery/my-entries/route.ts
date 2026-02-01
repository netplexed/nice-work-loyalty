import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { LotteryService } from '@/lib/lottery/service'

export async function GET(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const drawingId = searchParams.get('drawing_id')

    try {
        const service = new LotteryService(supabase)
        let targetDrawingId = drawingId

        if (!targetDrawingId) {
            // Default to current active drawing
            const drawing = await service.getCurrentDrawing()
            if (drawing) {
                targetDrawingId = drawing.id
            } else {
                return NextResponse.json({ entries: [] })
            }
        }

        const entries = await service.getUserEntries(targetDrawingId!, user.id)

        return NextResponse.json({ entries })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
