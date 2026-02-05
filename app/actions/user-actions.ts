'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { trackEvent } from '@/app/actions/marketing-event-actions'

import { createAdminClient } from '@/lib/supabase/admin'

export async function getUserProfile() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    if (!profile) {
        // Lazy create profile if it doesn't exist
        // MUST use Admin Client because users might not have INSERT permission on profiles
        // (RLS usually restricts INSERT to Service Role/Triggers)
        const adminSupabase = createAdminClient()

        const newProfile = {
            id: user.id,
            email: user.email,
            phone: null,
            points_balance: 0,
            tier: 'bronze',
            total_visits: 0,
            total_spent: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }

        const { error: insertError } = await adminSupabase
            .from('profiles')
            .insert(newProfile as any)

        if (insertError) {
            console.error('Error creating profile:', insertError)
            throw new Error(`Profile creation failed: ${insertError.message} (Code: ${insertError.code})`)
        }

        // Trigger Marketing Workflow (Signup)
        await trackEvent(user.id, 'user.signup', { email: user.email })

        return newProfile
    }

    return profile
}

export async function updateUserProfile(data: {
    full_name?: string
    email?: string
    phone?: string
    birthday?: string
    avatar_url?: string
    marketing_consent?: boolean
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // 1. Check if email is changing and update Auth first (checks uniqueness)
    if (data.email && data.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
            email: data.email
        })

        if (authError) {
            console.error('Error updating auth email:', authError)
            throw new Error(`Failed to update login email: ${authError.message}`)
        }
    }

    // 2. If Auth update passed (or didn't happen), update public profile
    const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id)

    if (error) throw error

    revalidatePath('/profile')
    return { success: true }
}

export async function getPointsHistory(limit = 10) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

    return data || []
}
