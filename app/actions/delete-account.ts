'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function deleteAccount() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // 1. Call database function to convert data
    const { error } = await supabase.rpc('delete_own_account')

    if (error) {
        console.error('Delete account error:', error)
        throw new Error('Failed to delete account data')
    }

    // 2. Sign out
    await supabase.auth.signOut()

    // 3. Redirect
    return { success: true }
}
