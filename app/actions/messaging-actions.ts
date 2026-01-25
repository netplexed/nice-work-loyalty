'use server'

import { createClient } from '@/lib/supabase/server'
import { verifyAdmin } from './admin-actions'
import { revalidatePath } from 'next/cache'

export interface BroadcastParams {
    title: string
    body: string
    targetTier?: number // If null/undefined, send to all
    sendEmail?: boolean
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

    // 2. Select Target Query
    let query = supabase.from('profiles').select('id, email, marketing_consent')

    // Filter by tier if needed
    let userIds: string[] = []
    let emailRecipients: string[] = []

    if (params.targetTier) {
        const { data: accounts } = await supabase
            .from('nice_accounts')
            .select('user_id')
            .gte('tier_bonus', params.targetTier)

        const accountUserIds = accounts?.map(a => a.user_id) || []
        if (accountUserIds.length === 0) return { success: true, sent: 0 }

        // Fetch profiles for these users
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, marketing_consent')
            .in('id', accountUserIds)

        if (profiles) {
            userIds = profiles.map(p => p.id)
            if (params.sendEmail) {
                // Filter for consent and valid email
                emailRecipients = profiles
                    .filter(p => p.marketing_consent && p.email)
                    .map(p => p.email!)
            }
        }

    } else {
        // All users
        const { data: profiles } = await query
        if (profiles) {
            userIds = profiles.map(p => p.id)
            if (params.sendEmail) {
                emailRecipients = profiles
                    .filter(p => p.marketing_consent && p.email)
                    .map(p => p.email!)
            }
        }
    }

    if (userIds.length === 0) return { success: true, sent: 0 }

    // 3. Create In-App Notifications
    const notifications = userIds.map(uid => ({
        user_id: uid,
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

    // 4. Send Push Notifications (Background)
    try {
        const { sendPushBatch } = await import('@/lib/push/send-push')
        await sendPushBatch(userIds, params.title, params.body)
    } catch (e) {
        console.error('Failed to send push batch:', e)
    }

    // 5. Send Emails (Background)
    if (params.sendEmail && emailRecipients.length > 0) {
        try {
            const { sendEmail } = await import('@/lib/email/send-email')
            // Send in batches or loop. For Resend "Batch" API or loop. 
            // Resend allows 'to' array for single email to multiple, but that exposes CC. 
            // We want individual emails or BCC.
            // Best practice: Loop or Batch API. Let's loop for now (rate limit beware).
            // Actually, 'to' field in Resend sends distinct emails if using Batch API? No.
            // 'to' array sends one email to multiple people (visible).
            // We must send individually or use 'bcc' if we don't care about personalization.
            // Let's send individually to test.

            // IMPORTANT: For production with thousands, use a queue.
            // For MVP, limit to first 50 or loop safely.

            await Promise.allSettled(emailRecipients.map(email =>
                sendEmail({
                    to: email,
                    subject: params.title,
                    html: `<p>${params.body}</p><br/><hr/><p style="font-size:12px; color: #666;">You received this email because you opted in to marketing updates from Nice Work. <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile">Unsubscribe</a></p>`
                })
            ))

        } catch (e) {
            console.error('Failed to send emails:', e)
        }
    }

    return { success: true, sent: notifications.length, emailCount: emailRecipients.length }
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
