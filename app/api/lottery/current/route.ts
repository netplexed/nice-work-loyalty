import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { formatDistance, addMinutes } from 'date-fns'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Get current active drawing
    const { data: drawing, error: drawingError } = await supabase
        .from('lottery_drawings')
        .select('*')
        .eq('status', 'active')
        .order('draw_date', { ascending: true }) // Get the soonest one
        .limit(1)
        .maybeSingle()

    if (drawingError) {
        return NextResponse.json({ error: drawingError.message }, { status: 500 })
    }

    if (!drawing) {
        return NextResponse.json({ error: 'No active lottery drawing' }, { status: 404 })
    }

    // 2. Get user entries if logged in
    let userEntries = []
    let totalUserEntries = 0
    let breakdown = { base: 0, purchased: 0, visit: 0, checkin: 0 }
    let remaining = { can_purchase: 10, can_visit: 3, can_checkin: true }

    if (user) {
        const { data: entries } = await supabase
            .from('lottery_entries')
            .select('*')
            .eq('drawing_id', drawing.id)
            .eq('user_id', user.id)

        userEntries = entries || []

        // --- LAZY AUTO-ENTRY CHECK ---
        // If drawing has auto-entry config, ensure user gets their free entry
        if (drawing.auto_entry_config?.type === 'all' && userEntries.length === 0) {
            const qty = drawing.auto_entry_config.quantity || 1

            // Double check we haven't already awarded (though userEntries was empty)
            // Perform insert safely
            const { data: newEntry, error: insertError } = await supabase
                .from('lottery_entries')
                .insert({
                    drawing_id: drawing.id,
                    user_id: user.id,
                    entry_type: 'base',
                    quantity: qty
                })
                .select()
                .single()

            if (!insertError && newEntry) {
                // Update local state to reflect the new entry immediately
                userEntries = [newEntry];

                // Async update total stats (don't await to avoid blocking UI)
                (supabase.rpc as any)('recalculate_lottery_stats', { p_drawing_id: drawing.id }).then(() => { })
            }
        }

        // Re-calculate derived stats
        if (userEntries.length > 0) {
            totalUserEntries = userEntries.reduce((sum, e) => sum + e.quantity, 0)
            breakdown.base = userEntries.filter(e => e.entry_type === 'base').reduce((s, e) => s + e.quantity, 0)
            breakdown.purchased = userEntries.filter(e => e.entry_type === 'purchased').reduce((s, e) => s + e.quantity, 0)
            breakdown.visit = userEntries.filter(e => e.entry_type === 'visit').reduce((s, e) => s + e.quantity, 0)
            breakdown.checkin = userEntries.filter(e => e.entry_type === 'checkin').reduce((s, e) => s + e.quantity, 0)

            // Calculate remaining limits
            // Purchased limit: 10
            remaining.can_purchase = Math.max(0, 10 - breakdown.purchased)

            // Visit limit: 3 entries
            remaining.can_visit = Math.max(0, 3 - breakdown.visit)

            // Checkin: 2 entries once per week
            remaining.can_checkin = breakdown.checkin === 0
        }
    }

    // 3. Calculate odds
    // Total entries = drawing.total_entries. 
    // However, this value is updated by our functions.
    // Odds are user_entries / total_entries.
    const totalPool = Math.max(drawing.total_entries, 1) // Avoid div by zero
    const percentage = ((totalUserEntries / totalPool) * 100).toFixed(4) + '%'

    // 4. Time until draw
    const drawDate = new Date(drawing.draw_date)
    const timeUntil = formatDistance(drawDate, new Date(), { addSuffix: true })

    return NextResponse.json({
        drawing,
        user_entries: {
            total: totalUserEntries,
            breakdown
        },
        remaining,
        odds: {
            numerator: totalUserEntries,
            denominator: totalPool,
            percentage
        },
        time_until_draw: timeUntil
    })
}
