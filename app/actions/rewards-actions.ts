'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAvailableRewards() {
    const supabase = await createClient()

    const nowIso = new Date().toISOString()

    // Prefer manual display order when the column is available.
    const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('active', true)
        .eq('is_hidden', false)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order('display_order', { ascending: true })
        .order('points_cost', { ascending: true })
        .order('created_at', { ascending: false })

    if (error) {
        // If newer columns don't exist yet (migration not run), fall back safely.
        // Postgres error 42703: undefined_column
        if (error.code === '42703') {
            const { data: fallbackOrderedData, error: fallbackOrderedError } = await supabase
                .from('rewards')
                .select('*')
                .eq('active', true)
                .eq('is_hidden', false)
                .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
                .order('points_cost', { ascending: true })
                .order('created_at', { ascending: false })

            if (!fallbackOrderedError) {
                return fallbackOrderedData || []
            }

            if (fallbackOrderedError.code === '42703') {
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('rewards')
                    .select('*')
                    .eq('active', true)
                    .eq('is_hidden', false)
                    .order('points_cost', { ascending: true })
                    .order('created_at', { ascending: false })

                if (fallbackError) {
                    console.error('Error fetching rewards fallback:', fallbackError)
                    return []
                }

                return fallbackData || []
            }

            console.error('Error fetching rewards fallback:', fallbackOrderedError)
            return []
        }

        console.error('Error fetching rewards:', error)
        return []
    }

    return data || []
}

// ... other imports ...

export async function getUserRedemptions() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data: redemptions, error } = await supabase
        .from('redemptions')
        .select(`
            *,
            rewards (
                name,
                description,
                image_url,
                category
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching redemptions:', error)
        return []
    }

    return redemptions
}

export async function redeemReward(rewardId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Not authenticated' }

    // Get reward details
    const { data: reward } = await supabase
        .from('rewards')
        .select('*')
        .eq('id', rewardId)
        .single()

    if (!reward) return { success: false, error: 'Reward not found' }

    // Get user profile for points check
    const { data: profile } = await supabase
        .from('profiles')
        .select('points_balance')
        .eq('id', user.id)
        .single()

    if (!profile || profile.points_balance < reward.points_cost) {
        return { success: false, error: 'Insufficient points' }
    }

    // Generate voucher code (simple random string for MVP)
    const voucherCode = Math.random().toString(36).substring(2, 10).toUpperCase()

    // Start transaction: Deduct points and create redemption
    // Note: For production, this should be a DB transaction or RPC function
    // Here we rely on RLS and optimistic concurrency for MVP

    const { error: redemptionError } = await supabase
        .from('redemptions')
        .insert({
            user_id: user.id,
            reward_id: rewardId,
            points_spent: reward.points_cost,
            status: 'pending',
            voucher_code: voucherCode
        })

    if (redemptionError) return { success: false, error: redemptionError.message }

    const { error: pointsError } = await supabase
        .from('points_transactions')
        .insert({
            user_id: user.id,
            transaction_type: 'redeemed',
            points: -reward.points_cost,
            description: `Redeemed ${reward.name}`,
            reference_id: rewardId
        })

    if (pointsError) return { success: false, error: pointsError.message }

    revalidatePath('/rewards')
    revalidatePath('/')

    return { success: true, voucherCode }
}
