import webPush from 'web-push'
import { createClient } from '@/lib/supabase/server'

// Initialize VAPID
webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushNotification(userId: string, title: string, body: string, url = '/') {
    const supabase = await createClient()

    // 1. Fetch subscriptions
    const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)

    if (!subscriptions || subscriptions.length === 0) return

    // 2. Prepare payload
    const payload = JSON.stringify({
        title,
        body,
        url,
        icon: '/icon.png' // Ensure this exists or use standard
    })

    // 3. Send to all user devices
    const results = await Promise.allSettled(subscriptions.map(async (sub) => {
        try {
            await webPush.sendNotification({
                endpoint: sub.endpoint,
                keys: sub.keys as any
            }, payload)
            return { status: 'fulfilled', subId: sub.id }
        } catch (error: any) {
            console.error(`[Push Failed] Sub ID: ${sub.id}, Status: ${error.statusCode}`, error)
            if (error.statusCode === 410 || error.statusCode === 404) {
                // Subscription expired/gone, remove it
                await supabase.from('push_subscriptions').delete().eq('id', sub.id)
            }
            throw error
        }
    }))

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`[sendPushNotification] User ${userId}: ${succeeded} sent, ${failed} failed.`)
}

import { createAdminClient } from '@/lib/supabase/admin'

export async function sendPushBatch(userIds: string[], title: string, body: string) {
    if (!userIds.length) return

    const supabase = createAdminClient()

    // 1. Fetch ALL subscriptions for these users (Using Admin Client = No RLS)
    const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_id', userIds)

    if (error) {
        console.error('[sendPushBatch] Error fetching subscriptions:', error)
        return
    }

    if (!subscriptions || subscriptions.length === 0) {
        console.log('[sendPushBatch] No subscriptions found for any of the target users.')
        return
    }

    console.log(`[sendPushBatch] Sending to ${subscriptions.length} endpoints for ${userIds.length} users.`)

    // 2. Prepare Payload
    const payload = JSON.stringify({
        title,
        body,
        url: '/', // Default URL for broadcasts
        icon: '/icon.png'
    })

    // 3. Send in parallel (limit concurrency if needed, but for 1000 users Promise.allSettled is usually fine on Vercel)
    const results = await Promise.allSettled(subscriptions.map(async (sub) => {
        try {
            await webPush.sendNotification({
                endpoint: sub.endpoint,
                keys: sub.keys as any
            }, payload)

            return { status: 'fulfilled', subId: sub.id, userId: sub.user_id }
        } catch (error: any) {
            console.error(`[Push Failed] Sub ID: ${sub.id} (User: ${sub.user_id}), Status: ${error.statusCode}`, error)

            if (error.statusCode === 410 || error.statusCode === 404) {
                // Subscription expired/gone, remove it
                await supabase.from('push_subscriptions').delete().eq('id', sub.id)
            }
            throw error
        }
    }))

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`[sendPushBatch] Complete. Success: ${succeeded}, Failed: ${failed}`)

    // Optional: Return stats if needed by caller
}
