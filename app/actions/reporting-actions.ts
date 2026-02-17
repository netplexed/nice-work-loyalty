'use server'

import { createClient } from '@/lib/supabase/server'
import { verifyAdmin } from './admin-actions'
import { createAdminClient } from '@/lib/supabase/admin'

export interface DashboardStats {
    totalRevenue: number
    totalMembers: number
    activeMembers30d: number
    pointsLiability: number
    revenueTrend: { date: string; amount: number }[]
    revenueByLocation: { name: string; value: number }[]
    recentActivity: Array<{
        type: string
        id: string
        user: string
        description: string
        amount: number
        timestamp: Date
    }>
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    // 1. Parallel Aggregates
    const [
        { data: revenueData },
        { count: totalMembers },
        { data: pointsData },
        { data: activeMembersData },
        { data: recentPurchases },
        { data: recentRedemptions },
        { data: recentSignups }
    ] = await Promise.all([
        // Total Revenue (All Time) & By Location
        supabase.from('purchases').select('amount, location, created_at'),

        // Total Members
        supabase.from('profiles').select('*', { count: 'exact', head: true }),

        // Points Liability (Sum) - Fetching all to sum in JS as Supabase doesn't have easy SUM without function
        // For large datasets we should use a Postgres function or a view. For now, JS sum is okay for MVP unless users > 10k.
        supabase.from('profiles').select('points_balance'),

        // Active Members (30d) - Unique IDs from checkins/purchases
        // Simplify: Just check checkins in last 30d
        supabase.from('check_ins')
            .select('user_id')
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

        // Recent Activity: Purchases
        supabase.from('purchases')
            .select('*, profiles(full_name, email)')
            .order('created_at', { ascending: false })
            .limit(5),

        // Recent Activity: Redemptions
        supabase.from('redemptions')
            .select('*, profiles(full_name, email), rewards(name)')
            .order('created_at', { ascending: false })
            .limit(5),

        // Recent Activity: New Users
        supabase.from('profiles')
            .select('id, full_name, email, created_at')
            .order('created_at', { ascending: false })
            .limit(5)
    ])

    // --- Processing Data ---

    // 1. Revenue Calculations
    const totalRevenue = revenueData?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0

    // Revenue by Location
    const diverseMap = new Map<string, number>()
    revenueData?.forEach(p => {
        const loc = p.location || 'Unknown'
        diverseMap.set(loc, (diverseMap.get(loc) || 0) + p.amount)
    })

    // Format for Recharts Pie Chart
    const revenueByLocation = Array.from(diverseMap.entries()).map(([name, value]) => ({
        name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), // Title Case
        value
    }))

    // Revenue Trend (Last 30 Days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailyMap = new Map<string, number>()
    // Initialize last 30 days with 0
    for (let i = 0; i < 30; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        // Use YYYY-MM-DD format for consistency
        const isoDate = d.toISOString().split('T')[0]
        dailyMap.set(isoDate, 0)
    }

    revenueData?.forEach(p => {
        const pDate = new Date(p.created_at)
        if (pDate >= thirtyDaysAgo) {
            const dateKey = pDate.toISOString().split('T')[0]
            dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + p.amount)
        }
    })

    // Sort by date ascending for chart
    const revenueTrend = Array.from(dailyMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // 2. Points Liability
    const pointsLiability = pointsData?.reduce((acc, curr) => acc + (curr.points_balance || 0), 0) || 0

    // 3. Active Members (Unique Set)
    const activeMemberIds = new Set(activeMembersData?.map(c => c.user_id))
    const activeMembers30d = activeMemberIds.size

    // 4. Combined Recent Activity Feed
    // Normalize shapes
    const activityFeed = [
        ...(recentPurchases || []).map(p => ({
            type: 'purchase',
            id: p.id,
            user: p.profiles?.full_name || p.profiles?.email,
            description: `Spent $${p.amount} at ${p.location}`,
            amount: p.amount,
            timestamp: new Date(p.created_at)
        })),
        ...(recentRedemptions || []).map(r => ({
            type: 'redemption',
            id: r.id,
            user: r.profiles?.full_name || r.profiles?.email,
            description: `Redeemed ${r.rewards?.name}`,
            amount: 0,
            timestamp: new Date(r.created_at) // use created_at, not redeemed_at for activity feed of intent
        })),
        ...(recentSignups || []).map(u => ({
            type: 'signup',
            id: u.id,
            user: u.full_name || u.email,
            description: 'Joined the loyalty program',
            amount: 0,
            timestamp: new Date(u.created_at)
        }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10)

    return {
        totalRevenue,
        totalMembers: totalMembers || 0,
        activeMembers30d,
        pointsLiability,
        revenueTrend,
        revenueByLocation,
        recentActivity: activityFeed
    }
}

export type CohortType = 'people' | 'spend'

export interface CohortData {
    month: string // "2025-01"
    totalUsers: number // Users who joined in this month
    data: {
        monthIndex: number // 0, 1, 2...
        value: number // % for people, $ for spend
        absolute: number // users count for people, total $ for spend
    }[]
}

export async function getCohortStats(type: CohortType = 'people'): Promise<CohortData[]> {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    // 1. Fetch all users and their join dates
    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id, created_at')
        .order('created_at', { ascending: true })

    if (userError || !users) return []

    // 2. Fetch all activity (Check-ins and Purchases)
    // optimizing: select only needed fields
    const [checkinsRes, purchasesRes] = await Promise.all([
        supabase.from('check_ins').select('user_id, created_at'),
        supabase.from('purchases').select('user_id, amount, created_at')
    ])

    const checkins = checkinsRes.data || []
    const purchases = purchasesRes.data || []

    // 3. Process Cohorts
    // Map: "2025-01" -> { users: Set<ID>, activities: Map<MonthIndex, Set<ID> | number> }
    const cohorts = new Map<string, {
        joinDate: Date,
        userIds: Set<string>,
        monthlyActivity: Map<number, Set<string> | number>
        // For 'people': Set of userIds active in that relative month
        // For 'spend': Total amount spent in that relative month
    }>()

    // Helper to get YYYY-MM key
    const getMonthKey = (date: Date | string) => {
        const d = new Date(date)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }

    // A. Group users into cohorts
    const userCohortMap = new Map<string, string>() // query cache: userId -> cohortKey

    users.forEach(u => {
        const monthKey = getMonthKey(u.created_at)
        userCohortMap.set(u.id, monthKey)

        if (!cohorts.has(monthKey)) {
            cohorts.set(monthKey, {
                joinDate: new Date(u.created_at), // loosely use the first one found or just parse key
                userIds: new Set(),
                monthlyActivity: new Map()
            })
        }
        cohorts.get(monthKey)!.userIds.add(u.id)
    })

    // B. Process Activity
    const processEvent = (userId: string, date: string, amount: number = 0) => {
        const cohortKey = userCohortMap.get(userId)
        if (!cohortKey) return // User might be deleted or data inconsistent

        const cohort = cohorts.get(cohortKey)
        if (!cohort) return

        // Calculate relative month index
        // Simplification: Difference in months
        const joinParts = cohortKey.split('-')
        const joinYear = parseInt(joinParts[0])
        const joinMonth = parseInt(joinParts[1]) - 1 // 0-indexed for Date math

        const eventDate = new Date(date)
        const eventYear = eventDate.getFullYear()
        const eventMonth = eventDate.getMonth()

        const monthDiff = (eventYear - joinYear) * 12 + (eventMonth - joinMonth)

        if (monthDiff < 0) return // Should not happen unless data dirty

        // Update bucket
        if (type === 'people') {
            // Track Unique Active Users
            const monthSet = (cohort.monthlyActivity.get(monthDiff) as Set<string>) || new Set<string>()
            monthSet.add(userId)
            cohort.monthlyActivity.set(monthDiff, monthSet)
        } else {
            // Track Total Spend
            const currentTotal = (cohort.monthlyActivity.get(monthDiff) as number) || 0
            cohort.monthlyActivity.set(monthDiff, currentTotal + amount)
        }
    }

    // Process all checkins (only counts for 'people')
    if (type === 'people') {
        checkins.forEach(c => processEvent(c.user_id, c.created_at))
    }

    // Process all purchases (counts for both, but amount used for 'spend')
    purchases.forEach(p => processEvent(p.user_id, p.created_at, p.amount))


    // 4. Format Output
    // Sort cohorts by date descending (newest first)
    const sortedKeys = Array.from(cohorts.keys()).sort((a, b) => b.localeCompare(a))

    const result: CohortData[] = sortedKeys.map(key => {
        const cohort = cohorts.get(key)!
        const totalUsers = cohort.userIds.size

        // Find max month index to iterate up to (e.g. 12 months)
        // or just iterate available keys
        const dataPoints: { monthIndex: number, value: number, absolute: number }[] = []

        // We want 0..12 usually, or however far data goes
        // Let's find max index for this cohort
        const maxIndex = Math.max(...Array.from(cohort.monthlyActivity.keys()), 0)

        for (let i = 0; i <= maxIndex; i++) {
            let absolute = 0
            if (type === 'people') {
                const set = cohort.monthlyActivity.get(i) as Set<string>
                absolute = set ? set.size : 0
            } else {
                absolute = (cohort.monthlyActivity.get(i) as number) || 0
            }

            // Calculate Value
            // For people: % of totalUsers
            // For spend: Average per user? Or Total? 
            // User request image implies % for retention "11 (4.06%)"
            // For spend usually it's Cumulative or Average. Let's do Average per Cohort Member for now?
            // Actually the screenshot shows "Spending" tab. Commonly it's LTV (cumulative) or Monthly Spend per User.
            // Let's stick to Total Spend for now in 'absolute', and maybe Average in 'value' if needed.
            // Let's make 'value' the formatted number we want to show primarily.

            let value = 0
            if (type === 'people') {
                value = totalUsers > 0 ? (absolute / totalUsers) * 100 : 0
            } else {
                // For spend, let's return Average Revenue Per User (ARPU) for that month
                value = totalUsers > 0 ? absolute / totalUsers : 0
            }

            dataPoints.push({
                monthIndex: i,
                value,
                absolute
            })
        }

        return {
            month: key,
            totalUsers,
            data: dataPoints
        }
    })

    return result
}

export interface PointsSummaryData {
    date: string
    awardedAction: number
    awardedNoSubType: number
    awardedWithSubType: number
    redeemed: number
    adjustedAdd: number
    adjustedDeduct: number
}

export async function getPointsSummaryByDate(startDate?: string, endDate?: string): Promise<PointsSummaryData[]> {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    // Default to last 30 days if not provided
    const end = endDate ? new Date(endDate) : new Date()
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Ensure strict date boundaries
    end.setHours(23, 59, 59, 999)
    start.setHours(0, 0, 0, 0)

    const { data: transactions, error } = await supabase
        .from('points_transactions')
        .select('created_at, transaction_type, points, description')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })

    if (error || !transactions) return []

    // Map: "YYYY-MM-DD" -> Data Object
    const dailyMap = new Map<string, PointsSummaryData>()

    // Initialize all days in range to 0
    // This ensures no gaps in the table
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const isoDate = d.toISOString().split('T')[0]
        dailyMap.set(isoDate, {
            date: isoDate,
            awardedAction: 0,
            awardedNoSubType: 0,
            awardedWithSubType: 0,
            redeemed: 0,
            adjustedAdd: 0,
            adjustedDeduct: 0
        })
    }

    transactions.forEach(tx => {
        const dateKey = new Date(tx.created_at).toISOString().split('T')[0]

        // If transaction is outside expected range (shouldn't happen due to filter, but safe guard)
        if (!dailyMap.has(dateKey)) return

        const dayData = dailyMap.get(dateKey)!
        const points = tx.points

        switch (tx.transaction_type) {
            case 'earned_purchase':
                dayData.awardedAction += points
                break
            case 'earned_bonus':
                // Assuming bonus is "With Sub Type" for now (e.g. Multiplier)
                // If description indicates manual/non-subtype, could split logic
                dayData.awardedWithSubType += points
                break
            case 'redeemed':
                // Redemptions are usually negative in DB, or positive?
                // Standard: "points spent", usually stored as negative or tracked in redemptions table
                // Let's assume absolute value for report
                dayData.redeemed += Math.abs(points)
                break
            case 'adjusted':
                if (points > 0) {
                    dayData.adjustedAdd += points
                } else {
                    dayData.adjustedDeduct += points // Keep negative sign or absolute?
                    // Report column says "Deduct", usually implies absolute value visually 
                    // or just negative number. Let's keep data raw, UI can format.
                    // Actually, let's allow it to be negative in data to match expectation of "Deduct"
                }
                break
            default:
                // 'converted_to_points' -> maybe Awarded No Sub Type?
                if (points > 0) {
                    dayData.awardedNoSubType += points
                }
                break
        }
    })

    // Return as array, sorted by date desc
    return Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date))
}

export interface StoreActivityData {
    location: string
    checkIns: number
    purchasesCount: number
    totalRevenue: number
    avgTicket: number
}

export async function getStoreActivityStats(startDate?: string, endDate?: string): Promise<StoreActivityData[]> {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date()
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    end.setHours(23, 59, 59, 999)
    start.setHours(0, 0, 0, 0)

    const [checkInsRes, purchasesRes] = await Promise.all([
        supabase.from('check_ins')
            .select('location')
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString()),
        supabase.from('purchases')
            .select('location, amount')
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString())
    ])

    const statsMap = new Map<string, StoreActivityData>()

    // Init with known locations if desired, or dynamic
    // Dynamic is flexible
    const getOrInit = (loc: string) => {
        const cleanLoc = loc || 'Unknown'
        // Format name: "tanuki_raw" -> "Tanuki Raw"
        const displayName = cleanLoc.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

        if (!statsMap.has(displayName)) {
            statsMap.set(displayName, {
                location: displayName,
                checkIns: 0,
                purchasesCount: 0,
                totalRevenue: 0,
                avgTicket: 0
            })
        }
        return statsMap.get(displayName)!
    }

    checkInsRes.data?.forEach(c => {
        const stat = getOrInit(c.location)
        stat.checkIns++
    })

    purchasesRes.data?.forEach(p => {
        const stat = getOrInit(p.location)
        stat.purchasesCount++
        stat.totalRevenue += p.amount
    })

    // Calculate Averages
    const result = Array.from(statsMap.values()).map(s => ({
        ...s,
        avgTicket: s.purchasesCount > 0 ? s.totalRevenue / s.purchasesCount : 0
    }))

    return result.sort((a, b) => b.totalRevenue - a.totalRevenue)
}

export interface TopMemberData {
    id: string
    full_name: string | null
    email: string | null
    points_balance: number
    lifetime_earned: number
    lifetime_spend: number // Currency
}

export async function getTopMembers(limit: number = 50): Promise<TopMemberData[]> {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    // Fetch necessary data
    // We want to sort by Lifetime Earned Points (or Balance? Request says "Points Earned")
    // If we sort by lifetime earned, we need to calculate it for everyone.

    // 1. Fetch all profiles
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, points_balance')

    // 2. Fetch all earned transactions (to calc lifetime points)
    const { data: transactions } = await supabase.from('points_transactions')
        .select('user_id, points')
        .in('transaction_type', ['earned_purchase', 'earned_bonus'])

    // 3. Fetch all total spend (from purchases)
    const { data: purchases } = await supabase.from('purchases')
        .select('user_id, amount')

    if (!profiles) return []

    // Map: userId -> { earned, spend }
    const userStats = new Map<string, { earned: number, spend: number }>()

    transactions?.forEach(t => {
        const current = userStats.get(t.user_id) || { earned: 0, spend: 0 }
        current.earned += t.points
        userStats.set(t.user_id, current)
    })

    purchases?.forEach(p => {
        const current = userStats.get(p.user_id) || { earned: 0, spend: 0 }
        current.spend += p.amount
        userStats.set(p.user_id, current)
    })

    const result: TopMemberData[] = profiles.map(p => {
        const stats = userStats.get(p.id) || { earned: 0, spend: 0 }
        return {
            id: p.id,
            full_name: p.full_name,
            email: p.email,
            points_balance: p.points_balance || 0,
            lifetime_earned: stats.earned,
            lifetime_spend: stats.spend
        }
    })

    // Sort by Lifetime Earned desc
    return result.sort((a, b) => b.lifetime_earned - a.lifetime_earned).slice(0, limit)
}

export interface TierActivityData {
    tier_bonus: number
    member_count: number
    avg_points_balance: number
    avg_nice_balance: number
}

export async function getTierActivityStats(): Promise<TierActivityData[]> {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    // Fetch nice_accounts joined with profiles for point balance?
    // Or just fetch nice_accounts and we can assume points_balance is on profiles.
    // Let's fetch nice_accounts and profiles.

    const { data: accounts, error } = await supabase
        .from('nice_accounts')
        .select(`
            tier_bonus,
            nice_collected_balance,
            profiles!inner ( points_balance )
        `)

    if (error || !accounts) return []

    const tierMap = new Map<number, { count: number, totalPoints: number, totalNice: number }>()

    accounts.forEach((acc: {
        tier_bonus: number | null
        nice_collected_balance: number | null
        profiles: Array<{ points_balance: number | null }> | null
    }) => {
        const bonus = acc.tier_bonus || 1.0
        const current = tierMap.get(bonus) || { count: 0, totalPoints: 0, totalNice: 0 }

        current.count++
        current.totalNice += acc.nice_collected_balance || 0
        current.totalPoints += acc.profiles?.[0]?.points_balance || 0

        tierMap.set(bonus, current)
    })

    const result: TierActivityData[] = Array.from(tierMap.entries()).map(([bonus, stats]) => ({
        tier_bonus: bonus,
        member_count: stats.count,
        avg_points_balance: stats.count > 0 ? stats.totalPoints / stats.count : 0,
        avg_nice_balance: stats.count > 0 ? stats.totalNice / stats.count : 0
    }))

    return result.sort((a, b) => b.tier_bonus - a.tier_bonus)
}

export interface DailyReportData {
    reportDate: string
    uniqueUsersOpenedApp: number
    rewardsRedeemed: number
    rewardsUsed: number
    newUsersRegistered: number
    pointsEarned: number
    totalSpend: number
    niceEarned: number
    niceUsed: number
    totalMembersAsOfDate: number
    activeMembersAsOfDate: number
}

function toUtcDayRange(dateIso: string) {
    const dayStart = new Date(`${dateIso}T00:00:00.000Z`)
    const dayEnd = new Date(`${dateIso}T23:59:59.999Z`)
    return { dayStart, dayEnd }
}

export async function getDailyReport(dateIso?: string): Promise<DailyReportData> {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const selectedDate = dateIso || new Date().toISOString().split('T')[0]
    const { dayStart, dayEnd } = toUtcDayRange(selectedDate)

    if (Number.isNaN(dayStart.getTime()) || Number.isNaN(dayEnd.getTime())) {
        throw new Error('Invalid date')
    }

    const activeWindowStart = new Date(dayStart)
    activeWindowStart.setUTCMonth(activeWindowStart.getUTCMonth() - 3)

    const supabase = createAdminClient()

    const [
        { data: purchasesDay },
        { data: checkInsDay },
        { data: redemptionsDay },
        { count: rewardsUsedCount },
        { data: newUsersDay },
        { data: pointsEarnedDay },
        { data: niceTransactionsDay },
        { count: totalMembersAsOfDate },
        { data: purchasesActiveWindow },
        { data: checkInsActiveWindow }
    ] = await Promise.all([
        supabase
            .from('purchases')
            .select('user_id, amount')
            .gte('created_at', dayStart.toISOString())
            .lte('created_at', dayEnd.toISOString()),

        supabase
            .from('check_ins')
            .select('user_id')
            .gte('created_at', dayStart.toISOString())
            .lte('created_at', dayEnd.toISOString()),

        supabase
            .from('redemptions')
            .select('user_id')
            .gte('created_at', dayStart.toISOString())
            .lte('created_at', dayEnd.toISOString()),

        supabase
            .from('redemptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'redeemed')
            .gte('redeemed_at', dayStart.toISOString())
            .lte('redeemed_at', dayEnd.toISOString()),

        supabase
            .from('profiles')
            .select('id')
            .gte('created_at', dayStart.toISOString())
            .lte('created_at', dayEnd.toISOString()),

        supabase
            .from('points_transactions')
            .select('user_id, points')
            .in('transaction_type', [
                'earned_purchase',
                'earned_bonus',
                'earned_referral',
                'earned_social',
                'earned_spin',
                'earned_lottery'
            ])
            .gt('points', 0)
            .gte('created_at', dayStart.toISOString())
            .lte('created_at', dayEnd.toISOString()),

        supabase
            .from('nice_transactions')
            .select('user_id, nice_amount')
            .gte('created_at', dayStart.toISOString())
            .lte('created_at', dayEnd.toISOString()),

        supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .lte('created_at', dayEnd.toISOString()),

        supabase
            .from('purchases')
            .select('user_id')
            .gte('created_at', activeWindowStart.toISOString())
            .lte('created_at', dayEnd.toISOString()),

        supabase
            .from('check_ins')
            .select('user_id')
            .gte('created_at', activeWindowStart.toISOString())
            .lte('created_at', dayEnd.toISOString())
    ])

    const uniqueOpenedUsers = new Set<string>()
    const addUsersToSet = (
        target: Set<string>,
        rows?: Array<{ user_id?: string | null }>
    ) => {
        rows?.forEach(row => {
            if (row.user_id) target.add(row.user_id)
        })
    }

    addUsersToSet(uniqueOpenedUsers, purchasesDay as Array<{ user_id?: string | null }>)
    addUsersToSet(uniqueOpenedUsers, checkInsDay as Array<{ user_id?: string | null }>)
    addUsersToSet(uniqueOpenedUsers, redemptionsDay as Array<{ user_id?: string | null }>)
    addUsersToSet(uniqueOpenedUsers, pointsEarnedDay as Array<{ user_id?: string | null }>)
    addUsersToSet(uniqueOpenedUsers, niceTransactionsDay as Array<{ user_id?: string | null }>)
    newUsersDay?.forEach((row: { id: string }) => uniqueOpenedUsers.add(row.id))

    const pointsEarned = pointsEarnedDay?.reduce((sum, row: { points: number | null }) => {
        return sum + (row.points || 0)
    }, 0) || 0

    const totalSpend = purchasesDay?.reduce((sum, row: { amount: number | null }) => {
        return sum + Number(row.amount || 0)
    }, 0) || 0

    const niceEarned = niceTransactionsDay?.reduce((sum, row: { nice_amount: number | null }) => {
        const amount = row.nice_amount || 0
        return amount > 0 ? sum + amount : sum
    }, 0) || 0

    const niceUsed = niceTransactionsDay?.reduce((sum, row: { nice_amount: number | null }) => {
        const amount = row.nice_amount || 0
        return amount < 0 ? sum + Math.abs(amount) : sum
    }, 0) || 0

    const activeMembersSet = new Set<string>()
    addUsersToSet(activeMembersSet, purchasesActiveWindow as Array<{ user_id?: string | null }>)
    addUsersToSet(activeMembersSet, checkInsActiveWindow as Array<{ user_id?: string | null }>)

    return {
        reportDate: selectedDate,
        uniqueUsersOpenedApp: uniqueOpenedUsers.size,
        rewardsRedeemed: redemptionsDay?.length || 0,
        rewardsUsed: rewardsUsedCount || 0,
        newUsersRegistered: newUsersDay?.length || 0,
        pointsEarned,
        totalSpend,
        niceEarned,
        niceUsed,
        totalMembersAsOfDate: totalMembersAsOfDate || 0,
        activeMembersAsOfDate: activeMembersSet.size
    }
}
