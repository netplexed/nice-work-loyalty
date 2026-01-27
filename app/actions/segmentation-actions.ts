'use server'

import { createClient } from '@/lib/supabase/server'
import { verifyAdmin } from '@/app/actions/admin-actions'

export interface TargetCriteria {
    tiers?: string[] // e.g. ['Gold', 'Platinum']
    lastVisitDays?: number // Visited within last X days
    minSpend?: number // Lifetime spend > X
    birthdayMonth?: string // '01' to '12'
}

export async function resolveTargetAudience(criteria: TargetCriteria): Promise<{ userIds: string[], count: number }> {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    // Base query
    let query = supabase.from('profiles').select('id, tier, birthday')

    // 1. Filter by Tier
    if (criteria.tiers && criteria.tiers.length > 0 && !criteria.tiers.includes('all')) {
        query = query.in('tier', criteria.tiers)
    }

    // Fetch all profiles in batches of 1000 to bypass Supabase limits
    let profiles: any[] = []
    const BATCH_SIZE = 1000
    let batchIndex = 0
    let hasMore = true

    console.log(`[resolveTargetAudience] Starting batch fetch...`)

    while (hasMore) {
        const from = batchIndex * BATCH_SIZE
        const to = from + BATCH_SIZE - 1

        const { data, error } = await query.range(from, to)

        if (error) {
            console.error('Error fetching profiles batch:', error)
            throw new Error(error.message)
        }

        if (data && data.length > 0) {
            profiles = profiles.concat(data)
            if (data.length < BATCH_SIZE) {
                hasMore = false
            }
        } else {
            hasMore = false
        }
        batchIndex++
    }

    console.log(`[resolveTargetAudience] Fetched total ${profiles.length} profiles`)

    if (profiles.length === 0) return { userIds: [], count: 0 }

    let candidates = profiles

    // Filter Birthday in JS (easiest for now)
    if (criteria.birthdayMonth) {
        candidates = candidates.filter(p => {
            if (!p.birthday) return false
            const d = new Date(p.birthday)
            // Month is 0-indexed in JS, criteria is '01'-'12' string likely
            const month = (d.getMonth() + 1).toString().padStart(2, '0')
            return month === criteria.birthdayMonth
        })
    }

    let candidateIds = candidates.map(c => c.id)

    // 3. Filter by Last Visit (Check-ins)
    if (criteria.lastVisitDays) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - criteria.lastVisitDays)

        // Find users who have at least one check_in >= cutoffDate
        const { data: activeUsers } = await supabase
            .from('check_ins')
            .select('user_id')
            .in('user_id', candidateIds) // Optimization: only check candidates
            .gte('created_at', cutoffDate.toISOString())

        const activeUserIds = new Set(activeUsers?.map(u => u.user_id))
        candidateIds = candidateIds.filter(id => activeUserIds.has(id))
    }

    // 4. Filter by Min Spend (Purchases)
    if (criteria.minSpend && criteria.minSpend > 0) {
        // Aggregate spend per user (candidate)
        // This is tricky with standard query builder.
        // Option A: Raw SQL RPC (Cleanest)
        // Option B: Fetch all purchases for candidates and sum in JS (Heavy data transfer potentially)
        // Option C: Check 'points_transactions' earned_purchase type? Same issue.

        // Let's go with Option B (Fetch + Sum) for MVP robustness without new migrations right now.
        // We fetch `user_id, amount` from purchases where user_id in candidates.

        const { data: purchases } = await supabase
            .from('purchases')
            .select('user_id, amount')
            .in('user_id', candidateIds)

        const spendMap = new Map<string, number>()
        purchases?.forEach(p => {
            const current = spendMap.get(p.user_id) || 0
            spendMap.set(p.user_id, current + p.amount)
        })

        candidateIds = candidateIds.filter(id => {
            const total = spendMap.get(id) || 0
            return total >= (criteria.minSpend as number)
        })
    }

    return { userIds: candidateIds, count: candidateIds.length }
}

export async function estimateAudienceSize(criteria: TargetCriteria) {
    try {
        const { count } = await resolveTargetAudience(criteria)
        return count
    } catch (e) {
        return 0
    }
}
