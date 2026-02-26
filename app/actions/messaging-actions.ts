'use server'

import { createClient } from '@/lib/supabase/server'
import { verifyAdmin } from './admin-actions'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { unstable_noStore as noStore } from 'next/cache'
import { resolveTargetAudience, TargetCriteria } from './segmentation-actions'

const isDev = process.env.NODE_ENV !== 'production'

function debugLog(...args: any[]) {
    if (isDev) console.log(...args)
}

function debugWarn(...args: any[]) {
    if (isDev) console.warn(...args)
}

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
    debugLog(`[broadcastMessage] Resolving audience...`)
    const { userIds } = await resolveTargetAudience(params.targetCriteria || {})
    debugLog(`[broadcastMessage] Resolved ${userIds.length} users`)

    // Debug: Check if current admin is in the list
    const { data: { user } } = await supabase.auth.getUser()
    if (user && userIds.includes(user.id)) {
        debugLog(`[broadcastMessage] ✅ Current admin (${user.id}) IS in the target audience.`)
    } else {
        debugWarn(`[broadcastMessage] ❌ Current admin (${user?.id}) is NOT in the target audience.`)
    }

    if (userIds.length === 0) {
        debugWarn('[broadcastMessage] No users found for criteria. Aborting send.')
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

    // Use admin client (service role) for inserting notifications for other users
    const adminSupabase = createAdminClient()

    const { data: insertedNotifications, error: notifError } = await (adminSupabase
        .from('notifications') as any)
        .insert(notifications)
        .select()

    if (notifError) {
        console.error('[broadcastMessage] Notification insert error:', notifError)
        throw new Error('Failed to send notifications: ' + notifError.message)
    }

    // 4. Update sent count
    await (adminSupabase.from('admin_broadcasts') as any).update({ sent_count: notifications.length }).eq('id', broadcast.id)

    // 5. Send Push (Background attempt)
    try {
        const { sendPushBatch } = await import('@/lib/push/send-push')

        const pushTargets = insertedNotifications?.map((n: any) => ({
            userId: n.user_id,
            notificationId: n.id
        })) || []

        await sendPushBatch(pushTargets, params.title, params.body)
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
                    html: `<p>${params.body}</p><br/><hr/><p style="font-size:12px; color: #666;">nice work broadcast. <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile">Unsubscribe</a></p>`
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
    noStore()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // Filter out notifications older than 2 months
    const twoMonthsAgo = new Date()
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

    const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .gt('created_at', twoMonthsAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

    return data || []
}

export async function getUnreadCount() {
    noStore()
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

    debugLog(`[markNotificationRead] user=${user.id} id=${id}`)

    const { data, error, count } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()

    if (error) {
        console.error('[markNotificationRead] Error updating:', error)
        throw new Error(error.message)
    }

    if (!data || data.length === 0) {
        debugWarn('[markNotificationRead] No rows updated! Check RLS or ownership.')
        if (isDev) {
            // Dev-only diagnostic query, avoid extra DB read in production hot path.
            const { data: check } = await supabase.from('notifications').select('*').eq('id', id).single()
            debugLog('[markNotificationRead] Diagnostic check:', check)
        }
    } else {
        debugLog('[markNotificationRead] Success:', data)
    }

    revalidatePath('/notifications')
}

export async function markAllRead() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    debugLog(`[markAllRead] user=${user.id}`)

    const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .select()

    debugLog(`[markAllRead] Updated ${data?.length} notifications`)

    revalidatePath('/notifications')
}

export async function sendNotification(
    userId: string,
    title: string,
    body: string,
    url: string = '/'
) {
    // We use Admin Client to bypass RLS, allowing system or other users to trigger notifications for a target user
    const supabase = createAdminClient()

    // 1. Create In-App Notification
    const { data: notification, error } = await (supabase
        .from('notifications') as any)
        .insert({
            user_id: userId,
            title: title,
            body: body,
            type: 'system',
            is_read: false,
            data: { url }
        })
        .select()
        .single()

    if (error) {
        console.error('[sendNotification] Failed to create in-app notification:', error)
        // We continue to try push anyway? Or fail? Let's log and continue best effort.
    }

    // 2. Send Push Notification
    try {
        const { sendPushNotification } = await import('@/lib/push/send-push')
        await sendPushNotification(userId, title, body, url)
    } catch (e) {
        console.error('[sendNotification] Failed to send push:', e)
    }

    return { success: true }
}

export async function deleteBroadcast(id: string) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    // 1. Delete associated notifications first (due to foreign key)
    const { error: notifError } = await supabase
        .from('notifications')
        .delete()
        .eq('broadcast_id', id)

    if (notifError) throw new Error('Failed to delete notifications: ' + notifError.message)

    // 2. Delete the broadcast record
    const { error: broadcastError } = await supabase
        .from('admin_broadcasts')
        .delete()
        .eq('id', id)

    if (broadcastError) throw new Error('Failed to delete broadcast: ' + broadcastError.message)

    revalidatePath('/admin/messaging')
    return { success: true }
}
