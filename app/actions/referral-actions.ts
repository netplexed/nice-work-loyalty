'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitReferral(code: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    try {
        // 1. Validate Code Length/Format
        const cleanCode = code.trim().toUpperCase()
        if (cleanCode.length < 5) throw new Error('Invalid code format')

        // 2. Find the Referrer (Code Definition)
        const { data: referralRecord, error: codeError } = await supabase
            .from('referrals')
            .select('*')
            .eq('referral_code', cleanCode)
            .maybeSingle()

        if (!referralRecord) {
            throw new Error('Invalid referral code')
        }

        if (referralRecord.referrer_id === user.id) {
            throw new Error('Cannot redeem your own code')
        }

        // 3. Check if user already redeemed a code (One referral per user)
        const { data: existingRedemption } = await supabase
            .from('referral_redemptions')
            .select('id')
            .eq('referee_id', user.id)
            .maybeSingle()

        if (existingRedemption) {
            throw new Error('You have already redeemed a referral code')
        }

        // 4. Record Redemption & Award Points
        const BONUS_POINTS = 200

        // Use Admin Client to bypass RLS for sensitive writes (awarding points)
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const supabaseAdmin = createAdminClient()

        console.log('[submitReferral] Inserting redemption (Admin)...')
        // A. Insert Redemption Record
        const { error: redemptionError } = await (supabaseAdmin
            .from('referral_redemptions') as any)
            .insert({
                referrer_id: referralRecord.referrer_id,
                referee_id: user.id,
                code_used: cleanCode,
                points_awarded: BONUS_POINTS,
                referrer_rewarded: false // Referrer gets points only after referee spends
            })

        if (redemptionError) {
            console.error('[submitReferral] Redemption Insert Error:', redemptionError)
            if (redemptionError.code === '23505') { // Unique violation
                throw new Error('You have already been referred')
            }
            throw new Error(`Redemption failed: ${redemptionError.message}`)
        }

        // B. Award Points to Referee (The new user)
        console.log('[submitReferral] Awarding points to referee (Admin)...')
        const { error: refereeError } = await (supabaseAdmin
            .from('points_transactions') as any)
            .insert({
                user_id: user.id,
                transaction_type: 'earned_bonus',
                points: BONUS_POINTS,
                description: `Referral Bonus (Used code ${cleanCode})`
            })

        if (refereeError) {
            console.error('Error awarding points to referee:', refereeError)
        }

        // 5. Notify Referrer - DISABLED
        /*
        try {
            console.log('[submitReferral] Notifying referrer...')
            const { sendNotification } = await import('@/app/actions/messaging-actions')
            await sendNotification(
                referralRecord.referrer_id,
                'A friend just joined!',
                'Someone used your referral code. You\'ll earn 500 bonus points as soon as they visit!',
                '/profile'
            )
        } catch (e) {
            console.error('Failed to notify referrer', e)
        }
        */

        console.log('[submitReferral] Success!')
        // revalidatePath('/') // Temporarily disabled to debug
        return { success: true, points: BONUS_POINTS }

    } catch (error: any) {
        console.error('[submitReferral] Fatal Error:', error)
        return { success: false, error: error.message || 'An unexpected error occurred' }
    }
}
