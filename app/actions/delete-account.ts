'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteAccount() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'Not authenticated' }
        }

        console.log('Attempting to delete user:', user.id)

        // Use Admin Client to delete the Auth User directly
        const adminSupabase = createAdminClient()
        const { error } = await adminSupabase.auth.admin.deleteUser(user.id)

        if (error) {
            console.error('Delete account error:', error)
            return { success: false, error: error.message }
        }

        // We do NOT call signOut here. 
        // 1. The user is deleted, so the session is invalid invalid.
        // 2. signOut might try to revoke a token for a non-existent user, causing errors.
        // 3. The client side will handle the redirect/cleanup.

        return { success: true }
    } catch (err: any) {
        console.error('Unexpected error in deleteAccount:', err)
        return { success: false, error: err.message || 'An unexpected error occurred' }
    }
}
