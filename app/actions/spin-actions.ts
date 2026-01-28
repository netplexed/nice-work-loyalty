'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SpinPrize {
    id: string
    label: string
    type: 'points' | 'reward' | 'loss'
    points_value?: number
    reward_id?: string
    color: string
}

export interface SpinResult {
    success: boolean
    prize?: SpinPrize
    spin_id?: string
    error?: string
}

export async function getSpinConfig(): Promise<SpinPrize[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('spin_prizes')
        .select('*')
        .eq('active', true)
        .order('probability', { ascending: false }) // Order doesn't matter for visual, but consistent is good

    if (error) {
        console.error('Error fetching spin config:', error)
        return []
    }

    return data || []
}

export async function spin(): Promise<SpinResult> {
    const supabase = await createClient()

    // Call the secure RPC function
    const { data, error } = await supabase.rpc('process_spin')

    if (error) {
        console.error('Spin RPC error:', error)
        return { success: false, error: 'Failed to process spin' }
    }

    // data return from RPC is jsonb, typed as any by Supabase client usually
    // Structure: { success: boolean, error?: string, prize?: SpinPrize, spin_id?: string }
    const result = data as SpinResult

    if (result.success) {
        revalidatePath('/rewards')
        revalidatePath('/') // Updates points balance on home
    }

    return result
}
