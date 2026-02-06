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

        // Use Admin Client to delete everything
        // We must perform manual cleanup because some tables might lack ON DELETE CASCADE
        const adminSupabase = createAdminClient()

        // 1. Clean up unrelated data first
        await adminSupabase.from('push_subscriptions').delete().eq('user_id', user.id)
        await adminSupabase.from('nice_transactions').delete().eq('user_id', user.id)

        // 2. Clean up Activity data
        await adminSupabase.from('check_ins').delete().eq('user_id', user.id)
        await adminSupabase.from('spins').delete().eq('user_id', user.id)
        await adminSupabase.from('purchases').delete().eq('user_id', user.id)
        await adminSupabase.from('redemptions').delete().eq('user_id', user.id)
        await adminSupabase.from('points_transactions').delete().eq('user_id', user.id)

        // 3. Clean up Rewards & Lottery
        await adminSupabase.from('lottery_entries').delete().eq('user_id', user.id)
        await adminSupabase.from('lottery_winners').delete().eq('user_id', user.id)

        // 4. Clean up Automation & Messaging (Cast to any as tables might be missing from types)
        await (adminSupabase.from('workflow_enrollments') as any).delete().eq('user_id', user.id)
        await (adminSupabase.from('automation_logs') as any).delete().eq('user_id', user.id)
        await (adminSupabase.from('notifications') as any).delete().eq('user_id', user.id)

        // 3. Clean up Referrals (both as referrer and referee)
        await adminSupabase.from('referrals').delete().or(`referrer_id.eq.${user.id},referee_id.eq.${user.id}`)

        // 4. Clean up Core Profiles
        await adminSupabase.from('nice_accounts').delete().eq('user_id', user.id)
        await adminSupabase.from('profiles').delete().eq('id', user.id)

        // 5. Finally, delete Auth User
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
