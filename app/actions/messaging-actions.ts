'use server'

import { createClient } from '@/lib/supabase/server'
import { verifyAdmin } from './admin-actions'
import { revalidatePath } from 'next/cache'

export interface BroadcastParams {
    title: string
    body: string
    targetTier?: number // If null/undefined, send to all
}

export async function broadcastMessage(params: BroadcastParams) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    // 1. Create Broadcast Record
    const { data: broadcast, error: broadcastError } = await supabase
        .from('admin_broadcasts')
        .insert({
            title: params.title,
            body: params.body,
            target_criteria: params.targetTier ? { tier: params.targetTier } : {},
            created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single()

    if (broadcastError) {
        throw new Error(`Failed to create broadcast: ${broadcastError.message}`)
    }

    // 2. Select Target Users
    let query = supabase.from('profiles').select('id')

    // If targeting by tier (nice level), we need to join/check nice_accounts
    // Note: This assumes 1:1 profile:nice_account
    if (params.targetTier) {
        // This is a bit complex RLS-wise if profiles don't directly have tier.
        // Let's do a subquery or join approach logic in application code for now
        // For MVP, if we want to target by tier, we fetch nice_accounts first

        const { data: accounts } = await supabase
            .from('nice_accounts')
            .select('user_id')
            .gte('tier_bonus', params.targetTier)

        if (!accounts || accounts.length === 0) return { success: true, sent: 0 }

        const userIds = accounts.map(a => a.user_id)

        // Prepare Notifications
        const notifications = userIds.map(uid => ({
            user_id: uid,
            title: params.title,
            body: params.body,
            type: 'broadcast',
            broadcast_id: broadcast.id
        }))

        // Bulk Insert (batching if needed, but 10k is usually limit)
        // For larger sets, we'd queue this or use a postgres function.
        if (notifications.length > 0) {
            const { error: notifError } = await supabase.from('notifications').insert(notifications)
            if (notifError) throw notifError
        }

        // Update sent count
        await supabase.from('admin_broadcasts').update({ sent_count: notifications.length }).eq('id', broadcast.id)

        return { success: true, sent: notifications.length }

    } else {
        // Send to ALL users
        const { data: allUsers } = await supabase.from('profiles').select('id')

        if (!allUsers || allUsers.length === 0) return { success: true, sent: 0 }

        const notifications = allUsers.map(u => ({
            user_id: u.id,
            title: params.title,
            body: params.body,
            type: 'broadcast',
            broadcast_id: broadcast.id
        }))

        if (notifications.length > 0) {
            const { error: notifError } = await supabase.from('notifications').insert(notifications)
            if (notifError) throw notifError
        }

        await supabase.from('admin_broadcasts').update({ sent_count: notifications.length }).eq('id', broadcast.id)

        return { success: true, sent: notifications.length }
    }
}

export async function getBroadcasts() {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data } = await supabase.from('admin_broadcasts').select('*').order('created_at', { ascending: false })
    return data || []
}

// User Actions

export async function getUserNotifications() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

    return data || []
}

export async function getUnreadCount() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

    return count || 0
}

export async function markNotificationRead(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user.id)

    revalidatePath('/notifications')
}

export async function markAllRead() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

    revalidatePath('/notifications')
}
