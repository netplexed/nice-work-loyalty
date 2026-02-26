'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Send, Cookie, RefreshCw, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { sendPushNotification } from '@/app/actions/push-actions'

export default function DebugPage() {
    const [loading, setLoading] = useState(false)
    const [logs, setLogs] = useState<string[]>([])
    const [cookies, setCookies] = useState<string>('')

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])

    useEffect(() => {
        setCookies(document.cookie)
    }, [])

    const handleRefreshCookies = () => {
        setCookies(document.cookie)
        addLog('Cookies refreshed')
    }

    const handleTestPush = async () => {
        setLoading(true)
        addLog('Starting web push test...')
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                addLog('Error: Not logged in')
                return
            }
            addLog(`User ID: ${user.id}`)

            // Check subscription
            addLog('Checking browser subscription...')
            if (!('serviceWorker' in navigator)) {
                addLog('❌ Service Worker not supported')
                return
            }

            const reg = await navigator.serviceWorker.ready
            const sub = await reg.pushManager.getSubscription()

            if (!sub) {
                addLog('❌ No browser subscription found! Toggle notifications OFF and ON again.')
                toast.error('No subscription found')
                return
            }
            addLog('✅ Browser subscription active')

            const result = await sendPushNotification(user.id, 'Test Notification', 'This is a test from the debug page!', '/debug')

            if (result.success) {
                addLog(`✅ Server sent: ${result.sent} success, ${result.failed} failed`)
                toast.success('Test sent!')
            } else {
                addLog(`❌ Server error: ${result.error}`)
            }

        } catch (e: any) {
            addLog(`❌ Client Error: ${e.message}`)
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleTestNativePush = async () => {
        setLoading(true)
        addLog('Starting native FCM push test...')
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                addLog('❌ Error: Not logged in')
                return
            }
            addLog(`User ID: ${user.id}`)

            // Check if there's a native FCM subscription in Supabase
            addLog('Checking FCM subscription in database...')
            const { data: subs, error: subError } = await supabase
                .from('push_subscriptions')
                .select('id, endpoint, keys, updated_at')
                .eq('user_id', user.id)

            if (subError) {
                addLog(`❌ DB error: ${subError.message}`)
                return
            }

            if (!subs || subs.length === 0) {
                addLog('❌ No push subscriptions found in DB for this user!')
                addLog('   → Make sure you have opened the app and granted notification permission.')
                toast.error('No FCM subscription found in database')
                return
            }

            const nativeSubs = subs.filter((s: any) => !s.keys)
            const webSubs = subs.filter((s: any) => s.keys)
            addLog(`Found ${subs.length} subscription(s): ${nativeSubs.length} native FCM, ${webSubs.length} web`)

            if (nativeSubs.length === 0) {
                addLog('⚠️ Only web subscriptions found — no native FCM token registered.')
                addLog('   → Make sure you are using the native app (not browser) and have granted permission.')
            } else {
                addLog(`✅ FCM token present (last updated: ${new Date(nativeSubs[0].updated_at).toLocaleString()})`)
            }

            // Send the push via server action (same path as broadcasts)
            addLog('Sending push via server...')
            const result = await sendPushNotification(
                user.id,
                '🔔 Native Push Test',
                'If you see this, push notifications are working!',
                '/debug'
            )

            if (result.success) {
                addLog(`✅ Server sent: ${result.sent} success, ${result.failed} failed`)
                if (result.sent && result.sent > 0) {
                    toast.success('Push sent! Check your notification center.')
                } else {
                    addLog('⚠️ Server responded OK but sent=0. Check server logs for FCM errors.')
                    toast.warning('Sent 0 pushes — check logs')
                }
            } else {
                addLog(`❌ Server error: ${result.error}`)
                toast.error(`Push failed: ${result.error}`)
            }

        } catch (e: any) {
            addLog(`❌ Error: ${e.message}`)
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleTestAutomations = async () => {
        setLoading(true)
        addLog('Checking automations...')
        try {
            const { triggerManualAutomation } = await import('@/app/actions/debug-automations')
            const result = await triggerManualAutomation()
            if (result.success) {
                const res = result as any
                if (res.logs && res.logs.length > 0) {
                    res.logs.forEach((log: string) => addLog(`📝 ${log}`))
                }
                const count = res.results.reduce((acc: number, curr: any) => acc + curr.sent, 0)
                addLog(`✅ Automations run. Sent: ${count} emails.`)
                if (count > 0) {
                    toast.success(`Sent ${count} automation emails!`)
                } else {
                    toast.info('No pending automations found for you.')
                }
            } else {
                addLog('❌ Automation error')
            }
        } catch (e: any) {
            addLog(`❌ Error: ${e.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-4 space-y-4 pb-20 max-w-md mx-auto">
            <h1 className="text-2xl font-bold">System Debugger</h1>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Cookie className="w-4 h-4" />
                        Session Diagnostics
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Current Cookies</label>
                            <Button variant="ghost" size="icon" onClick={handleRefreshCookies} className="h-6 w-6">
                                <RefreshCw className="h-3 w-3" />
                            </Button>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-900 p-2 rounded text-[10px] break-all font-mono">
                            {cookies || 'No cookies found'}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Test Native Push (iOS/Android)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Tests the full FCM push path used by broadcasts. Checks your FCM token registration in the database, then sends a real push notification via the server.
                    </p>
                    <Button onClick={handleTestNativePush} disabled={loading} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Native Push Test
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Test Web Push
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Tests browser-based web push (not applicable on native iOS).
                    </p>
                    <Button onClick={handleTestPush} disabled={loading} variant="outline" className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Web Push Test
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4" />
                        Test Automations
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Manually trigger pending automations (Welcome, Birthday, etc.) for your account.
                        Checks if you meet criteria and haven't received it yet.
                    </p>
                    <Button onClick={handleTestAutomations} disabled={loading} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Run Automations Check
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-slate-950 text-slate-50 p-4 rounded-md font-mono text-xs overflow-x-auto h-48 overflow-y-auto">
                        {logs.length === 0 ? (
                            <span className="opacity-50">Waiting for action...</span>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="border-b border-slate-800 py-1 last:border-0">
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
