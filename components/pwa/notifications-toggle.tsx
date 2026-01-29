'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { BellOff } from 'lucide-react'
import { saveSubscription } from '@/app/actions/push-actions'
import { toast } from 'sonner'
import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function NotificationsToggle() {
    const [isSupported, setIsSupported] = useState(false)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (Capacitor.isNativePlatform() || ('serviceWorker' in navigator && 'PushManager' in window)) {
            setIsSupported(true)
            checkSubscription()
        } else {
            console.log('Push notifications not supported')
            setLoading(false)
        }
    }, [])

    async function checkSubscription() {
        try {
            if (Capacitor.isNativePlatform()) {
                const { receive } = await FirebaseMessaging.checkPermissions()
                setIsSubscribed(receive === 'granted')
                return
            }

            // In dev mode or if SW fails, .ready hangs forever. Add timeout.
            const timeout = new Promise((resolve) => setTimeout(resolve, 2000));
            const registration = await Promise.race([
                navigator.serviceWorker.ready,
                timeout
            ])

            if (!registration) {
                console.log('Service Worker not ready (timeout)')
                return // Keep isSubscribed false
            }

            // If we won the race against timeout, we have a registration (but verify type)
            if ('pushManager' in (registration as ServiceWorkerRegistration)) {
                const sub = await (registration as ServiceWorkerRegistration).pushManager.getSubscription()
                setIsSubscribed(!!sub)
            }
        } catch (e) {
            console.error('Error checking subscription:', e)
        } finally {
            setLoading(false)
        }
    }

    async function subscribe() {
        setLoading(true)
        try {
            if (Capacitor.isNativePlatform()) {
                const result = await FirebaseMessaging.requestPermissions()
                if (result.receive === 'granted') {
                    const { token } = await FirebaseMessaging.getToken()
                    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
                    const result = await saveSubscription(token, platform)
                    if (!result.success) throw new Error(result.error)

                    setIsSubscribed(true)
                    toast.success('Notifications enabled!')
                } else {
                    toast.error('Permission denied. Please enable in settings.')
                }
                return
            }

            const registration = await navigator.serviceWorker.ready
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidKey) throw new Error('Missing VAPID key')

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
            })

            const result = await saveSubscription(JSON.parse(JSON.stringify(subscription)))
            if (!result.success) throw new Error(result.error)

            setIsSubscribed(true)
            toast.success('Notifications enabled!')
        } catch (error: any) {
            console.error('Subscription error:', error)
            toast.error('Failed to enable notifications: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    async function unsubscribe() {
        setLoading(true)
        try {
            if (Capacitor.isNativePlatform()) {
                // Native unsubscribe typically involves revoking token or just server-side flag.
                // For now we will just delete the token to stop receiving.
                await FirebaseMessaging.deleteToken()
                setIsSubscribed(false)
                toast.info('Notifications disabled.')
                return
            }

            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()
            if (subscription) {
                await subscription.unsubscribe()
                setIsSubscribed(false)
                toast.info('Notifications disabled.')
            }
        } catch (e) {
            toast.error('Error disabling notifications')
        } finally {
            setLoading(false)
        }
    }

    const handleToggle = async (checked: boolean) => {
        if (checked) {
            await subscribe()
        } else {
            await unsubscribe()
        }
    }

    if (!isSupported) {
        // If on iOS/Mobile
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

        if (isIOS && !isStandalone) {
            // Not in PWA yet
            return (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:bg-transparent px-2"
                    onClick={() => toast.info("To enable notifications on iPhone, tap 'Share' -> 'Add to Home Screen', then open the app from your home screen.")}
                >
                    <BellOff className="mr-1.5 h-3 w-3" /> Enable
                </Button>
            )
        }

        // Unsupported or HTTP
        return (
            <Switch disabled checked={false} aria-label="Notifications not supported" />
        )
    }

    if (loading) {
        return <Switch disabled checked={isSubscribed} />
    }

    return (
        <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            aria-label="Toggle notifications"
        />
    )
}
