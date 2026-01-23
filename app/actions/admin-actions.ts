'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function verifyAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    const { data: admin } = await supabase
        .from('admin_users')
        .select('role')
        .eq('id', user.id)
        .eq('active', true)
        .single()

    return !!admin
}

export async function getAdminStats() {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    // Run parallel queries for efficiency
    const [
        { count: totalUsers },
        { count: totalSpins },
        { data: issuedPointsData },
        { count: totalRedemptions },
        { data: redeemedPointsData },
        { data: recentActivity }
    ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('spins').select('*', { count: 'exact', head: true }),
        supabase.from('points_transactions').select('points').gt('points', 0), // Fetch all positive point transactions
        supabase.from('redemptions').select('*', { count: 'exact', head: true }),
        supabase.from('redemptions').select('points_spent'),
        supabase.from('points_transactions')
            .select('*, profiles(email, full_name)')
            .order('created_at', { ascending: false })
            .limit(5)
    ])

    // Calculate totals
    const totalPointsIssued = issuedPointsData?.reduce((acc, curr) => acc + curr.points, 0) || 0
    const totalPointsRedeemed = redeemedPointsData?.reduce((acc, curr) => acc + curr.points_spent, 0) || 0

    return {
        totalUsers: totalUsers || 0,
        totalSpins: totalSpins || 0,
        totalPointsIssued,
        totalRedemptions: totalRedemptions || 0,
        totalPointsRedeemed,
        recentActivity: recentActivity || []
    }
}

export async function getAllUsers(page = 1, limit = 20) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

    if (error) throw error

    return { users: data, total: count || 0 }
}

export async function adjustPoints(userId: string, amount: number, reason: string, location?: string) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser() // Current Admin ID

    // Insert transaction
    const { error } = await supabase
        .from('points_transactions')
        .insert({
            user_id: userId,
            staff_id: user?.id,
            transaction_type: 'adjusted',
            points: amount,
            location: location || null,
            description: `Manual adjustment: ${reason}`,
            metadata: { reason }
        })

    if (error) throw error

    // Trigger should auto-update profile balance
    revalidatePath('/admin/users')
    return { success: true }
}

export async function getAdminRewards() {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    const { data: rewards, error } = await supabase
        .from('rewards')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error

    return rewards || []
}

export async function createReward(data: {
    name: string
    description?: string
    points_cost: number
    category?: string
    image_url?: string
    active?: boolean
    inventory_remaining?: number
    locations?: string[]
}) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    const { error } = await supabase
        .from('rewards')
        .insert({
            ...data,
            active: data.active ?? true,
            reward_type: 'voucher', // Default for now
            locations: data.locations || null
        })

    if (error) throw error

    revalidatePath('/admin/rewards')
    revalidatePath('/rewards') // Update public catalog too
    return { success: true }
}

export async function updateReward(id: string, data: {
    name?: string
    description?: string
    points_cost?: number
    category?: string
    image_url?: string
    active?: boolean
    inventory_remaining?: number
    locations?: string[]
}) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    const { error } = await supabase
        .from('rewards')
        .update(data)
        .eq('id', id)

    if (error) throw error

    revalidatePath('/admin/rewards')
    revalidatePath('/rewards')
    return { success: true }
}

export async function toggleRewardStatus(id: string, isActive: boolean) {
    return updateReward(id, { active: isActive })
}

export async function verifyAndRedeemVoucher(code: string) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Find the redemption
    const { data: redemption, error: findError } = await supabase
        .from('redemptions')
        .select(`
            *,
            rewards (name, description),
            profiles:user_id (full_name, email)
        `)
        .eq('voucher_code', code)
        .single()

    if (findError || !redemption) {
        throw new Error('Invalid voucher code')
    }

    if (redemption.status === 'redeemed') {
        throw new Error(`Voucher already redeemed on ${new Date(redemption.redeemed_at!).toLocaleDateString()}`)
    }

    if (redemption.status !== 'pending' && redemption.status !== 'approved') {
        throw new Error(`Voucher status is ${redemption.status}, cannot redeem`)
    }

    // Mark as redeemed
    const { error: updateError } = await supabase
        .from('redemptions')
        .update({
            status: 'redeemed',
            redeemed_at: new Date().toISOString(),
            redeemed_by_staff: user?.id
        })
        .eq('id', redemption.id)

    if (updateError) throw updateError

    return {
        success: true,
        rewardName: redemption.rewards?.name,
        customerName: redemption.profiles?.full_name || 'Unknown User'
    }
}
