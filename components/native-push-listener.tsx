'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { Badge } from '@capawesome/capacitor-badge'
import { saveSubscription } from '@/app/actions/push-actions'
import { markNotificationRead, getUnreadCount } from '@/app/actions/messaging-actions'
import { useRouter } from 'next/navigation'
import { mutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import { isExternalActionUrl, normalizeActionUrl } from '@/lib/action-url'

export function NativePushListener() {
    const router = useRouter()

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return

        const supabase = createClient()
        // Helper to sync badge
        const syncBadge = async () => {
            try {
                const count = await getUnreadCount()
                await Badge.set({ count })
                console.log('Badge updated:', count)
            } catch (e) {
                console.error('Failed to update badge:', e)
            }
        }

        // Core Push Logic
        const initPush = async () => {
            // Check auth first
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                console.log('Skipping push init - no user')
                return
            }

            try {
                // Request badge permission
                await Badge.requestPermissions()

                // 1. Request Permission
                const result = await FirebaseMessaging.requestPermissions()

                // Sync Initial Badge
                await syncBadge()

                if (result.receive === 'granted') {
                    // 2. Get FCM Token directly
                    try {
                        const { token } = await FirebaseMessaging.getToken()
                        console.log('FCM Token:', token)

                        const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
                        const saveResult = await saveSubscription(token, platform)
                        if (saveResult.success) {
                            console.log('Native Push Registered')
                        } else {
                            console.error('Failed to save native subscription:', saveResult.error)
                        }
                    } catch (tokenError: unknown) {
                        const message = tokenError instanceof Error ? tokenError.message : String(tokenError)
                        if (message.includes('No APNS token')) {
                            console.warn('FCM Token skipped (Simulator/No APNS). This is expected on Simulator.')
                        } else {
                            console.error('Failed to get FCM token:', tokenError)
                        }
                    }
                }
            } catch (e: unknown) {
                console.error('Push init error:', e)
            }
        }

        const addListeners = async () => {
            // Token refresh
            await FirebaseMessaging.addListener('tokenReceived', async event => {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
                await saveSubscription(event.token, platform)
            })

            // Notification received
            await FirebaseMessaging.addListener('notificationReceived', async () => {
                mutate('unread-notifications')
                await syncBadge()
            })

            // Notification tapped
            await FirebaseMessaging.addListener('notificationActionPerformed', async event => {
                const data = (event.notification.data ?? {}) as { notificationId?: string; url?: string }

                // Mark as read if we have an ID
                if (data?.notificationId) {
                    try {
                        await markNotificationRead(data.notificationId)
                        // Update local cache immediately
                        mutate('unread-notifications')
                    } catch (e) {
                        console.error('Failed to mark read on tap:', e)
                    }
                }

                await syncBadge()

                const actionUrl = normalizeActionUrl(data?.url)
                if (!actionUrl) return

                if (isExternalActionUrl(actionUrl)) {
                    window.location.assign(actionUrl)
                    return
                }

                router.push(actionUrl)
            })
        }

        // Initialize listeners once
        addListeners()

        // Check immediately
        initPush()

        // Listen for login events to retry init
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                initPush()
            }
        })

        return () => {
            FirebaseMessaging.removeAllListeners()
            subscription.unsubscribe()
        }
    }, [router])

    return null
}
