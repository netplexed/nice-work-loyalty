'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Types
export interface NiceAccount {
    id: string
    user_id: string
    nice_collected_balance: number
    tank_last_collected_at: string
    tank_capacity: number
    base_rate: number
    current_multiplier: number
    multiplier_expires_at: string | null
    tier_bonus: number
    total_nice_earned: number
    total_nice_spent: number
    total_collections: number
    created_at: string
    updated_at: string
}

export interface NiceState {
    collectedBalance: number
    tankNice: number
    tankCapacity: number
    tankFillPercentage: number
    nicePerHour: number
    nicePerSecond: number
    currentMultiplier: number
    multiplierExpiresAt: string | null
    tierBonus: number
    lastCollectedAt: string
}

export interface CollectionResult {
    niceCollected: number
    newBalance: number
    newTankNice: number
    timestamp: Date
}

export interface VisitBonusResult {
    bonusNiceAwarded: number
    newMultiplier: number
    multiplierExpiresAt: Date
    previousMultiplier: number
}

// Helper: Calculate current tank value
function calculateCurrentTankNice(account: NiceAccount): number {
    const now = new Date()
    const tankLastCollected = new Date(account.tank_last_collected_at)

    // Check if multiplier is active
    if (account.multiplier_expires_at && now < new Date(account.multiplier_expires_at)) {
        // Simple case: multiplier still active
        const hoursElapsed = (now.getTime() - tankLastCollected.getTime()) / (1000 * 60 * 60)
        const effectiveRate = account.base_rate * account.current_multiplier * account.tier_bonus
        const tankNice = hoursElapsed * effectiveRate

        return Math.min(tankNice, account.tank_capacity)
    }

    // If multiplier expired mid-generation
    if (account.multiplier_expires_at && now > new Date(account.multiplier_expires_at)) {
        const multiplierExpiry = new Date(account.multiplier_expires_at)

        // Only apply complex logic if expiry happened AFTER last collection
        if (multiplierExpiry > tankLastCollected) {
            // Calculate nice WITH multiplier (until expiry)
            const hoursWithMultiplier = (multiplierExpiry.getTime() - tankLastCollected.getTime()) / (1000 * 60 * 60)
            const rateWithMultiplier = account.base_rate * account.current_multiplier * account.tier_bonus
            const niceWithMultiplier = hoursWithMultiplier * rateWithMultiplier

            // Calculate nice AFTER multiplier expired (base rate only)
            const hoursAfterExpiry = (now.getTime() - multiplierExpiry.getTime()) / (1000 * 60 * 60)
            const baseRate = account.base_rate * account.tier_bonus
            const niceAfterExpiry = hoursAfterExpiry * baseRate

            const totalNice = niceWithMultiplier + niceAfterExpiry

            return Math.min(totalNice, account.tank_capacity)
        }
    }

    // No multiplier active (or expired before last collection)
    const hoursElapsed = (now.getTime() - tankLastCollected.getTime()) / (1000 * 60 * 60)
    const effectiveRate = account.base_rate * account.tier_bonus
    const tankNice = hoursElapsed * effectiveRate

    return Math.min(tankNice, account.tank_capacity)
}

function calculateEffectiveRate(account: NiceAccount): number {
    const now = new Date()

    // Check if multiplier is active
    const multiplierActive = account.multiplier_expires_at &&
        now < new Date(account.multiplier_expires_at)

    if (multiplierActive) {
        return account.base_rate * account.current_multiplier * account.tier_bonus
    }

    return account.base_rate * account.tier_bonus
}

export async function getNiceState(): Promise<NiceState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const { data: account, error } = await supabase
        .from('nice_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (error || !account) {
        // Handle case where account might not exist yet (though trigger should handle it)
        console.error('Error fetching nice account:', error)
        throw new Error('Nice account not found')
    }

    const tankNice = calculateCurrentTankNice(account)
    const effectiveRate = calculateEffectiveRate(account)

    return {
        collectedBalance: account.nice_collected_balance,
        tankNice: tankNice,
        tankCapacity: account.tank_capacity,
        tankFillPercentage: (tankNice / account.tank_capacity) * 100,
        nicePerHour: effectiveRate,
        nicePerSecond: effectiveRate / 3600,
        currentMultiplier: account.current_multiplier,
        multiplierExpiresAt: account.multiplier_expires_at,
        tierBonus: account.tier_bonus,
        lastCollectedAt: account.tank_last_collected_at
    }
}

export async function collectNice(): Promise<CollectionResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // Re-fetch state to be safe
    const state = await getNiceState()
    console.log('Attemping collection. State:', { tankFill: state.tankFillPercentage, tankNice: state.tankNice })

    // TEMPORARY: Allow collection at > 0% for testing (was 50%)
    if (state.tankNice < 1) {
        throw new Error('Nothing to collect yet (minimum 1 nice)')
    }

    const niceToCollect = Math.floor(state.tankNice)
    console.log('Nice to collect:', niceToCollect)

    const { data, error } = await supabase.rpc('collect_nice_transaction', {
        p_user_id: user.id,
        p_nice_amount: niceToCollect
    })

    if (error) {
        console.error('RPC Error:', error)
        throw error
    }

    console.log('Collection successful:', data)

    revalidatePath('/')

    return {
        niceCollected: niceToCollect,
        newBalance: data.new_balance,
        newTankNice: 0,
        timestamp: new Date()
    }
}


export async function awardVisitBonus(
    purchaseAmount: number
): Promise<VisitBonusResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // Logic to determine multiplier based on recent visits would go here
    // For MVP/Demo, we might just toggle it or set a fixed bonus
    // Assuming simple logic:
    const newMultiplier = 5.0 // Default for 1 visit

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data, error } = await supabase.rpc('award_visit_bonus', {
        p_user_id: user.id,
        p_multiplier: newMultiplier,
        p_expires_at: expiresAt.toISOString(),
        p_bonus_nice: 100
    })

    if (error) throw error

    revalidatePath('/')

    return {
        bonusNiceAwarded: 100,
        newMultiplier: newMultiplier,
        multiplierExpiresAt: expiresAt,
        previousMultiplier: data.previous_multiplier
    }
}

export async function convertNiceToPoints(
    niceAmount: number
): Promise<{ newNiceBalance: number, newPointsBalance: number, pointsGained: number }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const pointsToGain = Math.floor(niceAmount / 4)

    if (pointsToGain < 1) {
        throw new Error('Amount too small to convert (min 4 Nice)')
    }

    const { data, error } = await supabase.rpc('convert_nice_to_points', {
        p_user_id: user.id,
        p_nice_amount: niceAmount,
        p_points_amount: pointsToGain
    })

    if (error) {
        console.error('Conversion error:', error)
        throw error
    }

    revalidatePath('/')

    return {
        newNiceBalance: data.new_nice_balance,
        newPointsBalance: data.new_points_balance,
        pointsGained: pointsToGain
    }
}
