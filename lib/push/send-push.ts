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
    const promises = subscriptions.map(async (sub) => {
        try {
            await webPush.sendNotification({
                endpoint: sub.endpoint,
                keys: sub.keys as any
            }, payload)
        } catch (error: any) {
            if (error.statusCode === 410 || error.statusCode === 404) {
                // Subscription expired/gone, remove it
                await supabase.from('push_subscriptions').delete().eq('id', sub.id)
            } else {
                console.error('Push error:', error)
            }
        }
    })

    await Promise.allSettled(promises)
}

export async function sendPushBatch(userIds: string[], title: string, body: string) {
    // For large batches, you might want to queue this. 
    // Here we just map over users.
    const promises = userIds.map(id => sendPushNotification(id, title, body))
    await Promise.allSettled(promises)
}
