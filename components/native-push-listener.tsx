'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { saveSubscription } from '@/app/actions/push-actions'
import { useRouter } from 'next/navigation'
import { mutate } from 'swr'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export function NativePushListener() {
    const router = useRouter()

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return

        const supabase = createClient()
        let unsubscribeAuth: (() => void) | undefined

        // Core Push Logic
        const initPush = async () => {
            // Check auth first
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                console.log('Skipping push init - no user')
                return
            }

            try {
                // 1. Request Permission
                const result = await FirebaseMessaging.requestPermissions()
                if (result.receive === 'granted') {
                    // 2. Get FCM Token directly
                    const { token } = await FirebaseMessaging.getToken()
                    console.log('FCM Token:', token)

                    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
                    const saveResult = await saveSubscription(token, platform)
                    if (saveResult.success) {
                        console.log('Native Push Registered')
                        toast.success('Debug: Push Device Registered', { duration: 2000 })
                    } else {
                        // Suppress toast if just unauthorized (handing race condition)
                        if (!saveResult.error?.includes('Unauthorized')) {
                            toast.error('Debug: Push Reg Failed: ' + saveResult.error)
                        }
                    }
                }
            } catch (e: any) {
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
            await FirebaseMessaging.addListener('notificationReceived', event => {
                mutate('unread-notifications')
            })

            // Notification tapped
            await FirebaseMessaging.addListener('notificationActionPerformed', event => {
                const data = event.notification.data as any
                if (data?.url) router.push(data.url)
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
        unsubscribeAuth = () => subscription.unsubscribe()

        return () => {
            FirebaseMessaging.removeAllListeners()
            if (unsubscribeAuth) unsubscribeAuth()
        }
    }, [router])

    return null
}
