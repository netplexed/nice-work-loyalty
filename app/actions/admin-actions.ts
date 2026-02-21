'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { trackEvent } from '@/app/actions/marketing-event-actions'

type MemberTier = 'bronze' | 'silver' | 'gold' | 'platinum'
const VALID_MEMBER_TIERS: MemberTier[] = ['bronze', 'silver', 'gold', 'platinum']

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

export async function getAllUsers(page = 1, limit = 20, query = '') {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const from = (page - 1) * limit
    const to = from + limit - 1

    let dbQuery = supabase
        .from('profiles')
        .select('*, nice_accounts(nice_collected_balance)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

    if (query) {
        dbQuery = dbQuery.or(`email.ilike.%${query}%,phone.ilike.%${query}%,full_name.ilike.%${query}%`)
    }

    const { data, count, error } = await dbQuery

    if (error) throw error

    return { users: data, total: count || 0 }
}

export async function adminDeleteUser(targetUserId: string) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) throw new Error('Unauthorized')
    if (targetUserId === currentUser.id) {
        throw new Error('You cannot delete your own account from this page')
    }

    const adminSupabase = createAdminClient()

    // Prevent deleting active admin accounts from this user-management screen.
    const { count: activeAdminCount, error: activeAdminError } = await adminSupabase
        .from('admin_users')
        .select('*', { count: 'exact', head: true })
        .eq('id', targetUserId)
        .eq('active', true)

    if (activeAdminError) throw new Error(activeAdminError.message)
    if ((activeAdminCount || 0) > 0) {
        throw new Error('Cannot delete an active admin account from this page')
    }

    const { count: targetProfileCount, error: profileLookupError } = await adminSupabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('id', targetUserId)

    if (profileLookupError) throw new Error(profileLookupError.message)
    if ((targetProfileCount || 0) === 0) throw new Error('User not found')

    // Best-effort cleanup of related records.
    await adminSupabase.from('push_subscriptions').delete().eq('user_id', targetUserId)
    await adminSupabase.from('nice_transactions').delete().eq('user_id', targetUserId)
    await adminSupabase.from('check_ins').delete().eq('user_id', targetUserId)
    await adminSupabase.from('spins').delete().eq('user_id', targetUserId)
    await adminSupabase.from('purchases').delete().eq('user_id', targetUserId)
    await adminSupabase.from('redemptions').delete().eq('user_id', targetUserId)
    await adminSupabase.from('points_transactions').delete().eq('user_id', targetUserId)
    await adminSupabase.from('lottery_entries').delete().eq('user_id', targetUserId)
    await adminSupabase.from('lottery_winners').delete().eq('user_id', targetUserId)
    await (adminSupabase.from('workflow_enrollments') as unknown as { delete: () => { eq: (col: string, val: string) => Promise<unknown> } })
        .delete()
        .eq('user_id', targetUserId)
    await (adminSupabase.from('automation_logs') as unknown as { delete: () => { eq: (col: string, val: string) => Promise<unknown> } })
        .delete()
        .eq('user_id', targetUserId)
    await (adminSupabase.from('notifications') as unknown as { delete: () => { eq: (col: string, val: string) => Promise<unknown> } })
        .delete()
        .eq('user_id', targetUserId)

    const { error: referralsError } = await adminSupabase
        .from('referrals')
        .delete()
        .or(`referrer_id.eq.${targetUserId},referee_id.eq.${targetUserId}`)
    if (referralsError) throw new Error(referralsError.message)

    const { error: referralRedemptionsError } = await adminSupabase
        .from('referral_redemptions')
        .delete()
        .or(`referrer_id.eq.${targetUserId},referee_id.eq.${targetUserId}`)
    if (referralRedemptionsError) throw new Error(referralRedemptionsError.message)

    // Remove admin mapping (if any inactive record exists), then profile and auth user.
    await adminSupabase.from('admin_users').delete().eq('id', targetUserId)

    const { error: niceAccountError } = await adminSupabase
        .from('nice_accounts')
        .delete()
        .eq('user_id', targetUserId)
    if (niceAccountError) throw new Error(niceAccountError.message)

    const { error: profileDeleteError } = await adminSupabase
        .from('profiles')
        .delete()
        .eq('id', targetUserId)
    if (profileDeleteError) throw new Error(profileDeleteError.message)

    const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(targetUserId)
    if (authDeleteError) throw new Error(authDeleteError.message)

    revalidatePath('/admin/users')
    revalidatePath('/admin')
    return { success: true }
}

export async function adjustUserTier(userId: string, tier: string) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const normalizedTier = tier.trim().toLowerCase()
    if (!VALID_MEMBER_TIERS.includes(normalizedTier as MemberTier)) {
        throw new Error('Invalid tier value')
    }

    const adminSupabase = createAdminClient()

    const { count: profileCount, error: profileLookupError } = await adminSupabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('id', userId)

    if (profileLookupError) throw new Error(profileLookupError.message)
    if ((profileCount || 0) === 0) throw new Error('User not found')

    const { error: updateError } = await (adminSupabase.from('profiles') as unknown as {
        update: (values: { tier: string, updated_at: string }) => {
            eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>
        }
    })
        .update({
            tier: normalizedTier,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId)

    if (updateError) throw new Error(updateError.message)

    revalidatePath('/admin/users')
    revalidatePath('/admin')

    return {
        success: true,
        tier: normalizedTier
    }
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
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

    if (error) {
        if (error.code === '42703') {
            const { data: fallbackRewards, error: fallbackError } = await supabase
                .from('rewards')
                .select('*, redemptions(count)')
                .order('created_at', { ascending: false })

            if (fallbackError) throw fallbackError
            return fallbackRewards || []
        }

        throw error
    }

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
    expires_at?: string
    display_order?: number
}) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    const insertPayload = {
        ...data,
        active: data.active ?? true,
        reward_type: 'voucher', // Default for now
        locations: data.locations || null,
        display_order: data.display_order ?? 0
    }

    let { error } = await supabase
        .from('rewards')
        .insert(insertPayload)

    if (error?.code === '42703') {
        const { display_order: _displayOrder, ...legacyPayload } = insertPayload
        const { error: fallbackError } = await supabase
            .from('rewards')
            .insert(legacyPayload)
        error = fallbackError
    }

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
    expires_at?: string
    display_order?: number
}) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    const updatePayload = {
        ...data,
        ...(Object.prototype.hasOwnProperty.call(data, 'locations') ? { locations: data.locations || null } : {})
    }

    let { error } = await supabase
        .from('rewards')
        .update(updatePayload)
        .eq('id', id)

    if (error?.code === '42703') {
        const { display_order: _displayOrder, ...legacyPayload } = updatePayload
        const { error: fallbackError } = await supabase
            .from('rewards')
            .update(legacyPayload)
            .eq('id', id)
        error = fallbackError
    }

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

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Amount must be greater than 0')
    }

    const normalizedLocation = location.trim().toLowerCase()
    const allowedLocations = ['tanuki_raw', 'standing_sushi_bar']
    if (!allowedLocations.includes(normalizedLocation)) {
        throw new Error('Invalid location')
    }

    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser() // Admin ID
    if (!user) throw new Error('Unauthorized')

    const now = new Date()
    const nowIso = now.toISOString()

    // 1. Calculate points
    const POINTS_PER_DOLLAR = 5
    const purchaseAmount = Number(amount.toFixed(2))

    const [
        { data: profile, error: profileError },
        { data: account, error: accountError },
        { data: campaigns, error: campaignsError }
    ] = await Promise.all([
        adminSupabase
            .from('profiles')
            .select('tier')
            .eq('id', userId)
            .maybeSingle(),
        adminSupabase
            .from('nice_accounts')
            .select('current_multiplier, multiplier_expires_at')
            .eq('user_id', userId)
            .maybeSingle(),
        adminSupabase
            .from('campaigns')
            .select('campaign_type, multiplier, bonus_points, locations, target_tiers')
            .eq('active', true)
            .lte('start_date', nowIso)
            .gte('end_date', nowIso)
    ])

    if (profileError) throw new Error('Failed to read member profile: ' + profileError.message)
    const profileData = profile as unknown as { tier: string | null } | null
    if (!profileData) throw new Error('User not found')

    if (accountError) throw new Error('Failed to read member accelerator state: ' + accountError.message)
    const accountData = account as unknown as {
        current_multiplier: number | null
        multiplier_expires_at: string | null
    } | null

    if (campaignsError) throw new Error('Failed to read active campaigns: ' + campaignsError.message)
    const activeCampaigns = (campaigns as unknown as Array<{
        campaign_type: string | null
        multiplier: number | null
        bonus_points: number | null
        locations: string[] | null
        target_tiers: string[] | null
    }> | null) || []

    const memberTierRaw = typeof profileData.tier === 'string' ? profileData.tier.trim().toLowerCase() : 'bronze'
    const memberTier: MemberTier = VALID_MEMBER_TIERS.includes(memberTierRaw as MemberTier)
        ? (memberTierRaw as MemberTier)
        : 'bronze'

    let visitMultiplier = 1
    if (accountData?.multiplier_expires_at && new Date(accountData.multiplier_expires_at) > now) {
        visitMultiplier = Math.max(1, Number(accountData.current_multiplier || 1))
    }

    let campaignMultiplier = 1
    let campaignBonusPoints = 0

    for (const campaign of activeCampaigns) {
        const campaignLocations = Array.isArray(campaign.locations)
            ? campaign.locations.map((value) => String(value).toLowerCase())
            : []
        const campaignTargetTiers = Array.isArray(campaign.target_tiers)
            ? campaign.target_tiers.map((value) => String(value).toLowerCase())
            : []

        const locationMatches = campaignLocations.length === 0 || campaignLocations.includes(normalizedLocation)
        const tierMatches = campaignTargetTiers.length === 0 || campaignTargetTiers.includes(memberTier)
        if (!locationMatches || !tierMatches) continue

        if (campaign.campaign_type === 'multiplier' && typeof campaign.multiplier === 'number') {
            campaignMultiplier = Math.max(campaignMultiplier, Number(campaign.multiplier))
        }

        if (campaign.campaign_type === 'bonus_points' && typeof campaign.bonus_points === 'number') {
            campaignBonusPoints += Math.max(0, Math.floor(Number(campaign.bonus_points)))
        }
    }

    const multiplierApplied = Math.max(1, visitMultiplier, campaignMultiplier)
    const basePoints = Math.floor(purchaseAmount * POINTS_PER_DOLLAR)
    const multiplierBonusPoints = Math.floor(basePoints * (multiplierApplied - 1))
    const pointsToEarn = basePoints + multiplierBonusPoints + campaignBonusPoints

    const acceleratorSources: string[] = []
    if (visitMultiplier > 1) acceleratorSources.push('visit_multiplier')
    if (campaignMultiplier > 1) acceleratorSources.push('campaign_multiplier')
    if (campaignBonusPoints > 0) acceleratorSources.push('campaign_bonus_points')

    const descriptionExtras: string[] = []
    if (multiplierApplied > 1) descriptionExtras.push(`${multiplierApplied}x accelerator`)
    if (campaignBonusPoints > 0) descriptionExtras.push(`+${campaignBonusPoints} bonus`)
    const descriptionSuffix = descriptionExtras.length > 0 ? ` (${descriptionExtras.join(', ')})` : ''

    // 2. Record Purchase
    const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
            user_id: userId,
            location: normalizedLocation,
            amount: purchaseAmount,
            points_earned: pointsToEarn,
            staff_id: user?.id,
            multiplier_applied: multiplierApplied
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
            multiplier: multiplierApplied,
            location: normalizedLocation,
            description: `Purchase of $${purchaseAmount.toFixed(2)}${descriptionSuffix}`,
            metadata: {
                purchase_id: purchase.id,
                base_points: basePoints,
                multiplier_applied: multiplierApplied,
                multiplier_bonus_points: multiplierBonusPoints,
                campaign_bonus_points: campaignBonusPoints,
                accelerator_sources: acceleratorSources
            }
        })

    if (pointsError) {
        console.error('Points error:', pointsError)
        throw new Error('Failed to award points: ' + JSON.stringify(pointsError))
    }

    // 4. Apply visit multiplier from recorded spend through hardened admin RPC.
    const { error: visitBonusError } = await supabase.rpc('admin_apply_visit_multiplier', {
        p_user_id: userId
    })

    if (visitBonusError) {
        console.error('Failed to apply visit-based multiplier', visitBonusError)
    }

    // 5. Check for Pending Referral Reward
    // If the user (referee) hasn't triggered the reward for their referrer yet, do it now.
    const { data: referralRedemption } = await supabase
        .from('referral_redemptions')
        .select('*')
        .eq('referee_id', userId)
        .eq('referrer_rewarded', false)
        .maybeSingle()

    if (referralRedemption) {
        const REFERRER_BONUS = 250

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
                    'You earned 250 Points!',
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
    revalidatePath('/admin/users')
    revalidatePath('/admin/pos')
    revalidatePath(`/admin/users/${userId}`)

    // Trigger Marketing Workflow (Order Completed)
    await trackEvent(userId, 'order.completed', {
        value: purchaseAmount,
        points_earned: pointsToEarn,
        location: normalizedLocation
    })

    return {
        success: true,
        pointsEarned: pointsToEarn,
        purchaseId: purchase.id,
        multiplierApplied,
        bonusPoints: campaignBonusPoints
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

export async function adminCreateUser(data: {
    email: string
    fullName?: string
    tier?: string
    password?: string
}) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const adminSupabase = createAdminClient()

    // 1. Create Auth User
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: data.email,
        email_confirm: true,
        password: data.password || undefined,
        user_metadata: {
            full_name: data.fullName
        }
    })

    if (authError) {
        console.error('Error creating user:', authError)
        throw new Error(Failed to create user: )
    }

    if (!authData.user) {
        throw new Error('User creation succeeded but no user returned')
    }

    const userId = authData.user.id

    // 2. Attempt to manually create profile. 
    // Sometimes there are existing triggers that do this. If it fails due to unique constraint, we ignore.
    const newProfile = {
        id: userId,
        email: data.email,
        full_name: data.fullName || null,
        tier: data.tier || 'bronze',
        points_balance: 0,
        total_spent: 0,
        total_visits: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }

    const { error: profileError } = await adminSupabase
        .from('profiles')
        .insert(newProfile as any)

    if (profileError) {
        // If unique constraint violation (code 23505), it means a trigger already created the profile
        if (profileError.code !== '23505') {
            console.error('Error creating profile for new user:', profileError)
            throw new Error(User created but profile creation failed: )
        } else {
            // A trigger created it. Let's update it with the additional data (tier, full_name)
            await adminSupabase
                .from('profiles')
                .update({ tier: data.tier || 'bronze', full_name: data.fullName || null })
                .eq('id', userId)
        }
    }

    revalidatePath('/admin/users')
    revalidatePath('/admin')
    
    return { success: true, user: authData.user }
}
