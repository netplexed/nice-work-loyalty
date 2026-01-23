'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function canSpinToday() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    // Call the database function we defined in migration
    const { data, error } = await supabase.rpc('can_spin_today', {
        p_user_id: user.id
    })

    if (error) {
        console.error('Error checking spin eligibility:', error)
        return false
    }

    return data
}

export async function spinWheel() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const eligible = await canSpinToday()
    if (!eligible) throw new Error('Already spun today')

    // Probability Logic
    // 0-60: 50 points (60%)
    // 60-85: 100 points (25%)
    // 85-95: 500 points (10%)
    // 95-100: Voucher (5%) (For MVP we'll just give big points instead of complex voucher logic for now)

    const rand = Math.random() * 100
    let prize = { type: 'points', value: 50, description: '50 Points' }

    if (rand >= 95) {
        prize = { type: 'points', value: 1000, description: 'JACKPOT! 1000 Points' }
    } else if (rand >= 85) {
        prize = { type: 'points', value: 500, description: 'Big Win! 500 Points' }
    } else if (rand >= 60) {
        prize = { type: 'points', value: 100, description: '100 Points' }
    }

    // Record the spin
    const { error: spinError } = await supabase
        .from('spins')
        .insert({
            user_id: user.id,
            spin_type: 'daily',
            prize_type: prize.type,
            prize_value: prize.value,
            prize_description: prize.description,
            claimed: true
        })

    if (spinError) throw spinError

    // Award the points
    if (prize.type === 'points') {
        const { error: pointsError } = await supabase
            .from('points_transactions')
            .insert({
                user_id: user.id,
                transaction_type: 'earned_spin',
                points: prize.value,
                description: `Daily Spin: ${prize.description}`
            })

        if (pointsError) throw pointsError
    }

    revalidatePath('/')
    return prize
}

export async function submitCheckIn(location: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // Check if checked in today at this location (simple check)
    const { data: existing } = await supabase
        .from('check_ins')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('location', location)
        .gte('created_at', new Date().toISOString().split('T')[0]) // Today starts at 00:00 UTC roughly
        .maybeSingle()

    if (existing) {
        throw new Error('Already checked in today')
    }

    const points = 15

    const { error: checkinError } = await supabase
        .from('check_ins')
        .insert({
            user_id: user.id,
            location: location,
            points_awarded: points
        })

    if (checkinError) throw checkinError

    const { error: pointsError } = await supabase
        .from('points_transactions')
        .insert({
            user_id: user.id,
            transaction_type: 'earned_bonus',
            points: points,
            description: `Daily Check-in at ${location}`
        })

    if (pointsError) throw pointsError

    revalidatePath('/')
    return { success: true, points }
}
