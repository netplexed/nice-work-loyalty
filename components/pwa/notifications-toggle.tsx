'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { saveSubscription } from '@/app/actions/push-actions'
import { toast } from 'sonner'

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
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true)
            checkSubscription()
        } else {
            console.log('Push notifications not supported')
            setLoading(false)
        }
    }, [])

    async function checkSubscription() {
        try {
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
            const registration = await navigator.serviceWorker.ready
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidKey) throw new Error('Missing VAPID key')

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
            })

            await saveSubscription(JSON.parse(JSON.stringify(subscription)))
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

    if (!isSupported) return null

    if (loading) return <Button variant="outline" disabled size="icon"><Loader2 className="h-4 w-4 animate-spin" /></Button>

    return (
        <Button
            variant={isSubscribed ? "default" : "outline"}
            onClick={isSubscribed ? unsubscribe : subscribe}
            className="w-full sm:w-auto"
        >
            {isSubscribed ? (
                <>
                    <Bell className="mr-2 h-4 w-4" /> Notifications On
                </>
            ) : (
                <>
                    <BellOff className="mr-2 h-4 w-4" /> Enable Notifications
                </>
            )}
        </Button>
    )
}
