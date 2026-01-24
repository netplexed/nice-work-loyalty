'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function simulateCheckIn(location: string = 'Tanuki Raw') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // 1. Record the check-in (We allow multiple per day for testing/demo purposes)
    const { error: checkInError } = await supabase
        .from('check_ins')
        .insert({
            user_id: user.id,
            location: location,
            points_awarded: 15 // Base points for visit
        })

    if (checkInError) throw checkInError

    // 2. Calculate Streak (Visits in last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count } = await supabase
        .from('check_ins')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString())

    // Logic: 
    // 0-1 visits (just this one) -> 1.5x
    // 2 visits -> 2.0x
    // 3+ visits -> 3.0x
    // Note: Since we just inserted one, count should be at least 1

    let multiplier = 1.5
    if (count && count >= 2) multiplier = 2.0
    if (count && count >= 3) multiplier = 3.0

    // 3. Award Bonus / Update Multiplier
    // Expiration: 24 hours from now
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const { error: bonusError } = await supabase.rpc('award_visit_bonus', {
        p_user_id: user.id,
        p_multiplier: multiplier,
        p_expires_at: expiresAt.toISOString(),
        p_bonus_nice: 50 // Instant Nice bonus for visiting
    })

    if (bonusError) {
        console.error('Bonus Error', bonusError)
        throw new Error('Check-in recorded but bonus failed')
    }

    revalidatePath('/')
    return { success: true, multiplier, visitCount: count }
}
