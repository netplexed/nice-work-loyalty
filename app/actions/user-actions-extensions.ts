'use server'

import { createClient } from '@/lib/supabase/server'

export async function getReferralCode() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Check if code exists
    const { data: existing } = await supabase
        .from('referrals')
        .select('referral_code')
        .eq('referrer_id', user.id)
        .maybeSingle()

    if (existing) return existing.referral_code

    // Generate new code: First 4 chars of ID + Random 4 chars (Simple)
    const code = (user.id.substring(0, 4) + Math.random().toString(36).substring(2, 6)).toUpperCase()

    const { error } = await supabase
        .from('referrals')
        .insert({
            referrer_id: user.id,
            referral_code: code,
            status: 'pending' // Just a placeholder record for the code
        })

    if (error) {
        // Handle collision (rare for MVP)
        console.error('Error generating referral code:', error)
        return null
    }

    return code
}
