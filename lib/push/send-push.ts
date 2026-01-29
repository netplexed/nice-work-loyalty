import webPush from 'web-push'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

// Helper to init Firebase Admin
function getFirebaseAdmin() {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) return null

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

    if (getApps().length === 0) {
        return initializeApp({ credential: cert(serviceAccount) })
    }
    return getApp()
}

// Initialize VAPID
webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
)

interface PushSubscription {
    id: string
    user_id: string
    endpoint: string
    keys: {
        p256dh: string
        auth: string
    }
}

export async function sendPushNotification(userId: string, title: string, body: string, url = '/') {
    const supabase = await createClient()

    // 1. Fetch subscriptions
    const { data } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)

    const subscriptions = data as unknown as PushSubscription[]

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
            if (sub.keys) {
                // WEB PUSH
                await webPush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: sub.keys
                }, payload)
            } else {
                // NATIVE PUSH (FCM)
                const app = getFirebaseAdmin()
                if (app) {
                    await getMessaging(app).send({
                        token: sub.endpoint,
                        notification: { title, body },
                        data: { url }
                    })
                } else {
                    console.warn('[sendPushNotification] Firebase Admin not configured, skipping native push')
                }
            }
            return { status: 'fulfilled', subId: sub.id }
        } catch (error: any) {
            console.error(`[Push Failed] Sub ID: ${sub.id}, Status: ${error.statusCode || error.code}`, error.message)
            if (error.statusCode === 410 || error.statusCode === 404 || error.code === 'messaging/registration-token-not-registered') {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id)
            }
            throw error
        }
    }))

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`[sendPushNotification] User ${userId}: ${succeeded} sent, ${failed} failed.`)
}

export async function sendPushBatch(userIds: string[], title: string, body: string) {
    if (!userIds.length) return
    const supabase = createAdminClient()

    // 1. Fetch ALL subscriptions for these users (Using Admin Client = No RLS)
    // Chunk requests to avoid URL length limits with .in()
    const CHUNK_SIZE = 100
    let allSubscriptions: PushSubscription[] = []

    for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
        const chunk = userIds.slice(i, i + CHUNK_SIZE)
        const { data, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .in('user_id', chunk)

        if (error) {
            console.error(`[sendPushBatch] Error fetching subscriptions for chunk ${i}:`, error)
            continue
        }

        if (data) {
            allSubscriptions = [...allSubscriptions, ...data as unknown as PushSubscription[]]
        }
    }

    if (allSubscriptions.length === 0) {
        console.log('[sendPushBatch] No subscriptions found for any of the target users.')
        return
    }

    console.log(`[sendPushBatch] Sending to ${allSubscriptions.length} endpoints for ${userIds.length} target users.`)

    // 2. Prepare Payload
    const payload = JSON.stringify({
        title,
        body,
        url: '/', // Default URL for broadcasts
        icon: '/icon.png'
    })

    // 3. Send in parallel
    const results = await Promise.allSettled(allSubscriptions.map(async (sub) => {
        try {
            if (sub.keys) {
                // WEB PUSH
                await webPush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: sub.keys
                }, payload)
            } else {
                // NATIVE PUSH (FCM)
                const app = getFirebaseAdmin()
                if (app) {
                    await getMessaging(app).send({
                        token: sub.endpoint,
                        notification: { title, body },
                        data: { url: '/' }
                    })
                } else {
                    console.warn('[sendPushBatch] Firebase Admin not configured, skipping native push')
                }
            }
            return { status: 'fulfilled', subId: sub.id, userId: sub.user_id }
        } catch (error: any) {
            console.error(`[Push Failed] Sub ID: ${sub.id} (User: ${sub.user_id}), Status: ${error.statusCode || error.code}`, error.message)
            if (error.statusCode === 410 || error.statusCode === 404 || error.code === 'messaging/registration-token-not-registered') {
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

export async function sendBroadcastToAll(title: string, body: string, url = '/') {
    console.log('[sendBroadcastToAll] Starting broadcast:', { title, bodyPreview: body.substring(0, 50), url })

    const supabase = createAdminClient()

    // 1. Fetch ALL subscriptions (No user filter)
    console.log('[sendBroadcastToAll] Fetching all push subscriptions from database...')
    const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')

    if (error) {
        console.error('[sendBroadcastToAll] Error fetching subscriptions:', error)
        return
    }

    const subscriptions = data as unknown as PushSubscription[]

    if (!subscriptions || subscriptions.length === 0) {
        console.log('[sendBroadcastToAll] No subscriptions found in database. No push notifications will be sent.')
        return
    }

    console.log(`[sendBroadcastToAll] Found ${subscriptions.length} subscriptions. Sending push notifications...`)

    // 2. Prepare Payload
    const payload = JSON.stringify({
        title,
        body,
        url,
        icon: '/icon.png'
    })

    // 3. Send in parallel
    const results = await Promise.allSettled(subscriptions.map(async (sub) => {
        try {
            if (sub.keys) {
                // WEB PUSH
                await webPush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: sub.keys
                }, payload)
            } else {
                // NATIVE PUSH (FCM)
                const app = getFirebaseAdmin()
                if (app) {
                    await getMessaging(app).send({
                        token: sub.endpoint,
                        notification: { title, body },
                        data: { url }
                    })
                } else {
                    console.warn('[sendBroadcastToAll] Firebase Admin not configured, skipping native push')
                }
            }
            return { status: 'fulfilled', subId: sub.id, userId: sub.user_id }
        } catch (error: any) {
            console.error(`[Push Failed] Sub ID: ${sub.id} (User: ${sub.user_id}), Status: ${error.statusCode || error.code}`, error.message)
            if (error.statusCode === 410 || error.statusCode === 404 || error.code === 'messaging/registration-token-not-registered') {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id)
            }
            throw error
        }
    }))

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    console.log(`[sendBroadcastToAll] Complete. Success: ${succeeded}, Failed: ${failed}`)
}
