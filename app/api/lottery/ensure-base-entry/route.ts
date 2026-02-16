import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { LotteryService } from '@/lib/lottery/service'

export async function POST() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const service = new LotteryService(supabase)
        const drawing = await service.getCurrentDrawing()

        if (!drawing) {
            return NextResponse.json({ error: 'No active lottery drawing' }, { status: 404 })
        }

        const autoEntryConfig = (drawing as any).auto_entry_config || { type: 'all', quantity: 1 }
        if (autoEntryConfig.type !== 'all') {
            return NextResponse.json({ success: true, granted: false, reason: 'auto_entry_not_enabled' })
        }

        // Mirror previous behavior: only grant base entry when user has zero entries in this drawing.
        const { count: existingEntryCount, error: countError } = await supabase
            .from('lottery_entries')
            .select('id', { count: 'exact', head: true })
            .eq('drawing_id', drawing.id)
            .eq('user_id', user.id)

        if (countError) {
            return NextResponse.json({ error: countError.message }, { status: 500 })
        }

        if ((existingEntryCount || 0) > 0) {
            return NextResponse.json({ success: true, granted: false, reason: 'entries_exist' })
        }

        const quantity = Math.max(1, Number(autoEntryConfig.quantity || 1))
        const supabaseAdmin = createAdminClient()

        const { error: insertError } = await (supabaseAdmin
            .from('lottery_entries') as any)
            .insert({
                drawing_id: drawing.id,
                user_id: user.id,
                entry_type: 'base',
                quantity
            })

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        const { error: statsError } = await (supabase.rpc as any)('recalculate_lottery_stats', {
            p_drawing_id: drawing.id
        })

        if (statsError) {
            console.error('[ensure-base-entry] Failed to recalculate stats:', statsError)
        }

        return NextResponse.json({
            success: true,
            granted: true,
            drawing_id: drawing.id,
            quantity
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

