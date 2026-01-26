'use server'

import { createClient } from '@/lib/supabase/server'
import { verifyAdmin } from './admin-actions'
import { revalidatePath } from 'next/cache'
import { resolveTargetAudience, TargetCriteria } from './segmentation-actions'

interface BroadcastParams {
    title: string
    body: string
    targetCriteria?: TargetCriteria
    sendEmail?: boolean
}

export async function broadcastMessage(params: BroadcastParams) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    // 1. Create Broadcast Record
    const { data: broadcast, error: insertError } = await supabase
        .from('admin_broadcasts')
        .insert({
            title: params.title,
            body: params.body,
            target_criteria: params.targetCriteria || {},
            created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single()

    if (insertError) throw new Error('Failed to create broadcast: ' + insertError.message)

    // 2. Resolve Audience
    const { userIds } = await resolveTargetAudience(params.targetCriteria || {})

    if (userIds.length === 0) {
        return { success: true, sent: 0, emailCount: 0 }
    }

    // 3. Create In-App Notifications
    const notifications = userIds.map(uid => ({
        user_id: uid,
        title: params.title,
        body: params.body,
        type: 'broadcast',
        broadcast_id: broadcast.id,
        is_read: false
    }))

    const { error: notifError } = await supabase.from('notifications').insert(notifications)

    if (notifError) throw new Error('Failed to send notifications')

    // 4. Update sent count
    await supabase.from('admin_broadcasts').update({ sent_count: notifications.length }).eq('id', broadcast.id)

    // 5. Send Push (Background attempt)
    try {
        const { sendPushBatch } = await import('@/lib/push/send-push')
        await sendPushBatch(userIds, params.title, params.body)
    } catch (e) {
        console.error('Failed to send push batch:', e)
    }

    // 6. Send Email if requested
    let emailCount = 0
    if (params.sendEmail) {
        try {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('email')
                .in('id', userIds)
                .eq('marketing_consent', true)
                .not('email', 'is', null)

            const emails = profiles?.map(p => p.email).filter(Boolean) as string[] || []
            emailCount = emails.length

            if (emails.length > 0) {
                const { sendEmail } = await import('@/lib/email/send-email')
                const items = emails.map(email => ({
                    to: email,
                    subject: params.title,
                    html: `<p>${params.body}</p><br/><hr/><p style="font-size:12px; color: #666;">Nice Work Loyalty Broadcast. <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile">Unsubscribe</a></p>`
                }))

                // Limit concurrency
                const batchSize = 10
                for (let i = 0; i < items.length; i += batchSize) {
                    const batch = items.slice(i, i + batchSize)
                    await Promise.allSettled(batch.map(item => sendEmail(item)))
                }
            }
        } catch (e) {
            console.error('Failed to send emails:', e)
        }
    }

    return { success: true, sent: notifications.length, emailCount }
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
