import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { executeDrawing } from '@/lib/lottery/drawing-logic'

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const supabase = createAdminClient()

        // Find active drawing scheduled for now (or past due)
        const { data: drawing, error } = await supabase
            .from('lottery_drawings')
            .select('id')
            .eq('status', 'active')
            .lte('draw_date', new Date().toISOString())
            .limit(1)
            .limit(1)
            .maybeSingle() as any

        if (error) throw error

        if (!drawing) {
            return NextResponse.json({ message: 'No drawing ready to execute' })
        }

        const result = await executeDrawing(drawing.id)

        return NextResponse.json({ success: true, result })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
