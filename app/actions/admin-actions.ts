'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { trackEvent } from '@/app/actions/marketing-event-actions'

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
        .select('*, nice_accounts(nice_collected_balance)', { count: 'exact' })
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

export async function adjustNice(userId: string, amount: number, reason: string) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    // We update the account directly because RLS usually blocks insert on transactions for 'adjusted' 
    // unless we made a specific policy or function. 
    // Wait, let's check schema. nice_transactions has RLS. 
    // And nice_accounts has RLS.
    // Admin likely has bypass or we should use a function.
    // But points_adjustment uses simple insert relies on trigger? 
    // Points schema has 'update_points_balance' trigger.
    // Nice schema does NOT have a trigger for 'adjusted'. It has functions for collection.
    // So we must manually update both or create a function.
    // Let's do manual update of both for now, safer since we are admin role here (service role if we needed, but we are just authenticated admin).
    // Actually, admins CAN bypass RLS if we set it up, but let's assume we need to be explicit.

    // Simplest: Update Account, then Insert Transaction

    // 1. Update Account
    // Wait, admin needs RLS permission to update nice_accounts.
    // We haven't added specific Admin RLS policies for nice_accounts yet!
    // The query 'Users can view own nice account' is the only one.
    // We need to add an Admin policy or use SERVICE ROLE client for this action.
    // Since this is a server action, verifyAdmin checks auth table.
    // But createClient() uses the user's auth token.
    // So normal admin user might NOT have permission to update nice_accounts table directly via Row Level Security.

    // For Points it worked because we have "Admins can insert transactions" policy and a Trigger.
    // Nice doesn't have that trigger yet.

    // Let's use the SERVICE ROLE client to bypass RLS for this administrative action.
    // We don't have it imported but `createClient` usually takes a cookie store.
    // Actually, we can just use `supabase.rpc` if we create an admin function...
    // OR, simpler: I'll try to add an RPC for "admin_adjust_nice" in a migration?
    // User didn't ask for migration.
    // Let's try to update via SQL directly? No.

    // Let's assume we can add a quick SQL function or just use the existing setup if possible.
    // Actually, I'll just use the `collect_nice_transaction` logic? No that's for collection.

    // Screw it, I'll create a new migration for `admin_adjust_nice` function to be safe and clean.
    // But first let's just write the server action assuming I'll simplify it.

    // Actually, I can use the existing `collect_nice_transaction` if amount > 0? No, type is wrong.

    // I will write the function to attempt update. If it fails, I'll fix permissions.
    // But wait, `nice-actions.ts` uses `createClient`.

    // Let's try just updating directly. If it fails I'll notify user.

    const { error: accountError } = await supabase.rpc('admin_adjust_nice', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason
    })

    if (accountError) {
        // If RPC doesn't exist, we might fall back or error.
        console.error('Admin adjustment failed', accountError)
        throw new Error('Failed to adjust nice. ' + accountError.message)
    }

    revalidatePath('/admin/users')
    return { success: true }
}

export async function getAdminRewards() {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    const { data: rewards, error } = await supabase
        .from('rewards')
        .select('*, redemptions(count)')
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
    is_hidden?: boolean
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
    is_hidden?: boolean
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

export async function deleteReward(id: string) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', id)

    if (error) throw error

    revalidatePath('/admin/rewards')
    revalidatePath('/rewards')
    return { success: true }
}

export async function verifyAndRedeemVoucher(code: string) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Normalize code
    const normalizedCode = code.trim().toUpperCase()

    // Find the redemption
    // We use ilike to be safe, but normalizedCode should match if stored as uppercase.
    const { data: redemption, error: findError } = await supabase
        .from('redemptions')
        .select(`
            *,
            rewards (name, description),
            profiles:user_id (full_name, email)
        `)
        .ilike('voucher_code', normalizedCode)
        .maybeSingle()

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

export async function recordUserSpend(userId: string, amount: number, location: string = 'tanuki_raw') {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser() // Admin ID

    // 1. Calculate points
    const POINTS_PER_DOLLAR = 5
    const pointsToEarn = Math.floor(amount * POINTS_PER_DOLLAR)

    // 2. Record Purchase
    const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
            user_id: userId,
            location: location,
            amount: amount,
            points_earned: pointsToEarn,
            staff_id: user?.id,
            multiplier_applied: 1.0
        })
        .select()
        .single()

    if (purchaseError) {
        console.error('Purchase error:', purchaseError)
        throw new Error('Failed to record purchase: ' + purchaseError.message)
    }

    // 3. Award Points
    // We insert a 'earned' transaction
    const { error: pointsError } = await supabase
        .from('points_transactions')
        .insert({
            user_id: userId,
            staff_id: user?.id,
            transaction_type: 'earned_purchase',
            points: pointsToEarn,
            location: location,
            description: `Purchase of $${amount}`,
            metadata: { purchase_id: purchase.id }
        })

    if (pointsError) {
        console.error('Points error:', pointsError)
        throw new Error('Failed to award points: ' + JSON.stringify(pointsError))
    }

    // 4. Record Check-in (Visit)
    await supabase
        .from('check_ins')
        .insert({
            user_id: userId,
            location: location,
            points_awarded: 0
        })

    // 5. Check for Pending Referral Reward
    // If the user (referee) hasn't triggered the reward for their referrer yet, do it now.
    const { data: referralRedemption } = await supabase
        .from('referral_redemptions')
        .select('*')
        .eq('referee_id', userId)
        .eq('referrer_rewarded', false)
        .maybeSingle()

    if (referralRedemption) {
        const REFERRER_BONUS = 500

        // Award points to Referrer
        const { error: referrerError } = await supabase
            .from('points_transactions')
            .insert({
                user_id: referralRedemption.referrer_id,
                staff_id: user?.id, // attributed to admin triggering the spend
                transaction_type: 'earned_bonus',
                points: REFERRER_BONUS,
                description: `Referral Reward (Friend visited!)`
            })

        if (!referrerError) {
            // Mark as rewarded
            await supabase
                .from('referral_redemptions')
                .update({ referrer_rewarded: true })
                .eq('id', referralRedemption.id)

            // Notify Referrer
            try {
                const { sendNotification } = await import('@/app/actions/messaging-actions')
                await sendNotification(
                    referralRedemption.referrer_id,
                    'You earned 500 Points!',
                    'Your friend visited and made a purchase! Your referral bonus has been added.',
                    '/points'
                )
            } catch (e) {
                console.error('Failed to notify referrer', e)
            }
        } else {
            console.error('Failed to award referral bonus', referrerError)
        }
    }

    revalidatePath('/admin')
    revalidatePath(`/admin/users/${userId}`)

    // Trigger Marketing Workflow (Order Completed)
    await trackEvent(userId, 'order.completed', {
        value: amount,
        points_earned: pointsToEarn,
        location
    })

    return {
        success: true,
        pointsEarned: pointsToEarn,
        purchaseId: purchase.id
    }
}

export async function searchCustomer(query: string) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const cleanQuery = query.toLowerCase().trim()

    // 1. Try ID search (if it looks like UUID)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanQuery)
    if (isUuid) {
        const { data } = await supabase.from('profiles').select('*').eq('id', cleanQuery).single()
        if (data) return data
    }

    // 2. Try Email
    if (cleanQuery.includes('@')) {
        const { data } = await supabase.from('profiles').select('*').ilike('email', cleanQuery).single()
        if (data) return data
    }

    // 3. Try Phone (partial match or exact)
    // Remove non-digits for cleaner search if stored clean? 
    // Assuming stored as string. user input might have dashes.
    // For now, simple ilike.
    const { data } = await supabase.from('profiles').select('*').ilike('phone', `%${cleanQuery}%`).limit(1).maybeSingle()

    // 4. Try Name (Bonus)
    if (!data) {
        const { data: nameData } = await supabase.from('profiles').select('*').ilike('full_name', `%${cleanQuery}%`).limit(1).maybeSingle()
        return nameData
    }

    return data
}
