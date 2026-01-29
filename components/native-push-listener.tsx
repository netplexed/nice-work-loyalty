'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { saveSubscription } from '@/app/actions/push-actions'
import { useRouter } from 'next/navigation'
import { mutate } from 'swr'

export function NativePushListener() {
    const router = useRouter()

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return

        const initPush = async () => {
            try {
                // 1. Request Permission
                const result = await FirebaseMessaging.requestPermissions()
                if (result.receive === 'granted') {
                    // 2. Get FCM Token directly
                    const { token } = await FirebaseMessaging.getToken()
                    console.log('FCM Token:', token)

                    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
                    const result = await saveSubscription(token, platform)
                    if (!result.success) console.error('Failed to save native subscription:', result.error)
                } else {
                    console.warn('Push permissions denied')
                }
            } catch (e) {
                console.error('Push init error:', e)
            }
        }

        // Listeners
        const addListeners = async () => {
            // Token refresh
            await FirebaseMessaging.addListener('tokenReceived', async event => {
                console.log('Token Refresh:', event.token)
                const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
                const result = await saveSubscription(event.token, platform)
                if (!result.success) console.error('Failed to refresh native subscription:', result.error)
            })

            // Notification received (foreground)
            await FirebaseMessaging.addListener('notificationReceived', event => {
                console.log('Push received:', event.notification)
                // Refresh badge count
                mutate('unread-notifications')
            })

            // Notification tapped
            await FirebaseMessaging.addListener('notificationActionPerformed', event => {
                console.log('Push action:', event.notification)
                const data = event.notification.data as any
                if (data?.url) {
                    router.push(data.url)
                }
            })
        }

        initPush()
        addListeners()

        return () => {
            FirebaseMessaging.removeAllListeners()
        }
    }, [router])

    return null
}
