'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function resetDailySpin() {
    const supabase = await createClient()

    const { error } = await supabase.rpc('debug_reset_daily_spin')

    if (error) {
        console.error('Error resetting spin:', error)
        throw new Error('Failed to reset spin')
    }

    revalidatePath('/')
}
