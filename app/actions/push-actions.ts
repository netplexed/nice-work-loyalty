'use server'

import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'
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

// Initialize WebPush
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    )
}

export async function saveSubscription(subscription: any, platform: 'web' | 'ios' | 'android' = 'web') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    let endpoint = ''
    let keys = null

    if (platform === 'web') {
        if (!subscription.endpoint || !subscription.keys) throw new Error('Invalid web subscription')
        endpoint = subscription.endpoint
        keys = subscription.keys
    } else {
        // For native, subscription is the FCM token string
        if (typeof subscription !== 'string') throw new Error('Invalid native token')
        endpoint = subscription
        // keys remain null
    }

    // Check if exists
    const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
            user_id: user.id,
            endpoint: endpoint,
            keys: keys,
            updated_at: new Date().toISOString()
        }, { onConflict: 'endpoint' })

    if (error) {
        console.error('Save subscription error:', error)
        throw error
    }

    return { success: true }
}

export async function sendPushNotification(userId: string, title: string, body: string, url = '/') {
    const supabase = await createClient()

    const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)

    if (!subs?.length) return { success: false, error: 'No subscriptions found' }

    const results = await Promise.allSettled(
        subs.map(async sub => {
            try {
                if (sub.keys) {
                    // WEB PUSH
                    const payload = JSON.stringify({ title, body, url })
                    await webpush.sendNotification({
                        endpoint: sub.endpoint,
                        keys: sub.keys
                    }, payload)
                } else {
                    // NATIVE PUSH (FCM)
                    const app = getFirebaseAdmin()
                    if (app) {
                        const message = {
                            token: sub.endpoint,
                            notification: { title, body },
                            data: { url }
                        };
                        await getMessaging(app).send(message)
                    } else {
                        console.warn('Firebase Admin not configured, skipping native push')
                    }
                }
            } catch (err: any) {
                if (err.statusCode === 410 || err.statusCode === 404 || err.code === 'messaging/registration-token-not-registered') {
                    // Cleanup invalid subscription
                    console.log(`Cleaning up invalid subscription ${sub.id}`)
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id)
                }
                throw err
            }
        })
    )

    return {
        success: true,
        sent: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length
    }
}
