'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteAccount() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // Use Admin Client to delete the Auth User directly
    // This allows the user to sign up again with the same email immediately.
    // Triggers in the database (ON DELETE CASCADE) should handle the profile cleanup.
    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase.auth.admin.deleteUser(user.id)

    if (error) {
        console.error('Delete account error:', error)
        throw new Error('Failed to delete account')
    }

    // Sign out to clean up session
    await supabase.auth.signOut()

    return { success: true }
}
