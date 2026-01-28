'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAvailableRewards() {
    const supabase = await createClient()

    const { data } = await supabase
        .from('rewards')
        .select('*')
        .eq('active', true)
        .eq('is_hidden', false)
        .order('points_cost', { ascending: true })

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

    if (!user) throw new Error('Not authenticated')

    // Get reward details
    const { data: reward } = await supabase
        .from('rewards')
        .select('*')
        .eq('id', rewardId)
        .single()

    if (!reward) throw new Error('Reward not found')

    // Get user profile for points check
    const { data: profile } = await supabase
        .from('profiles')
        .select('points_balance')
        .eq('id', user.id)
        .single()

    if (!profile || profile.points_balance < reward.points_cost) {
        throw new Error('Insufficient points')
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

    if (redemptionError) throw redemptionError

    const { error: pointsError } = await supabase
        .from('points_transactions')
        .insert({
            user_id: user.id,
            transaction_type: 'redeemed',
            points: -reward.points_cost,
            description: `Redeemed ${reward.name}`,
            reference_id: rewardId
        })

    if (pointsError) throw pointsError

    revalidatePath('/rewards')
    revalidatePath('/')

    return { success: true, voucherCode }
}
