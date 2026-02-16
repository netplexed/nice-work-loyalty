'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { verifyAdmin } from './admin-actions'

export async function resetDailySpin() {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Debug action disabled in production')
    }

    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase.rpc('debug_reset_daily_spin', {
        p_user_id: user.id
    })

    if (error) {
        console.error('Error resetting spin:', error)
        throw new Error('Failed to reset spin')
    }

    revalidatePath('/')
}
