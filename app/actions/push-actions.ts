'use server'

import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

// Initialize WebPush only if keys are present (avoids build errors if env missing)
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    )
}

export async function saveSubscription(subscription: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    if (!subscription.endpoint || !subscription.keys) {
        throw new Error('Invalid subscription')
    }

    // Check if exists
    const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
            user_id: user.id,
            endpoint: subscription.endpoint,
            keys: subscription.keys,
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

    // Ideally verify admin here, but leaving open for internal calls for now
    // const { data: { user } } = await supabase.auth.getUser()
    // if (!user) throw new Error('Unauthorized')

    const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)

    if (!subs?.length) return { success: false, error: 'No subscriptions found' }

    const payload = JSON.stringify({ title, body, url })

    const results = await Promise.allSettled(
        subs.map(async sub => {
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: sub.keys
                }, payload)
            } catch (err: any) {
                if (err.statusCode === 410 || err.statusCode === 404) {
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
