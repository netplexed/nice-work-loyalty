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
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { success: false, error: 'Unauthorized: Please log in again' }

        let endpoint = ''
        let keys = null

        if (platform === 'web') {
            if (!subscription.endpoint || !subscription.keys) return { success: false, error: 'Invalid web subscription' }
            endpoint = subscription.endpoint
            keys = subscription.keys
        } else {
            // For native, subscription is the FCM token string
            if (typeof subscription !== 'string') return { success: false, error: 'Invalid native token' }
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
            return { success: false, error: 'Database error: ' + error.message }
        }

        return { success: true }
    } catch (e: any) {
        console.error('Unexpected error in saveSubscription:', e)
        return { success: false, error: e.message || 'Unknown server error' }
    }
}

export async function sendPushNotification(userId: string, title: string, body: string, url = '/') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Unauthorized' }

    if (user.id !== userId) {
        const { data: admin } = await supabase
            .from('admin_users')
            .select('id')
            .eq('id', user.id)
            .eq('active', true)
            .maybeSingle()

        if (!admin) {
            return { success: false, error: 'Forbidden' }
        }
    }

    const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)

    if (!subs?.length) return { success: false, error: 'No subscriptions found' }

    const results = await Promise.all(
        subs.map(async sub => {
            try {
                if (sub.keys) {
                    const payload = JSON.stringify({ title, body, url })
                    await webpush.sendNotification({
                        endpoint: sub.endpoint,
                        keys: sub.keys
                    }, payload)
                    return { success: true, platform: 'web' }
                } else {
                    const app = getFirebaseAdmin()
                    if (app) {
                        const message: any = {
                            token: sub.endpoint,
                            notification: { title, body },
                            data: { url: url || '/' },
                            apns: {
                                payload: {
                                    aps: {
                                        sound: 'default',
                                        badge: 1,
                                    }
                                }
                            }
                        };
                        const msgId = await getMessaging(app).send(message)
                        return { success: true, platform: 'native', msgId }
                    } else {
                        return { success: false, error: 'Firebase Admin not configured', platform: 'native' }
                    }
                }
            } catch (err: any) {
                const errorCode = err.code || 'unknown'
                if (err.statusCode === 410 || err.statusCode === 404 || err.code === 'messaging/registration-token-not-registered') {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id)
                    return { success: false, error: 'Token Expired', code: errorCode, platform: sub.keys ? 'web' : 'native' }
                }
                return { success: false, error: err.message || String(err), code: errorCode, platform: sub.keys ? 'web' : 'native' }
            }
        })
    )

    return {
        success: true,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        detail: results
    }
}
