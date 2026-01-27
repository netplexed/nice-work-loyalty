'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Send, Cookie, RefreshCw } from 'lucide-react'
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
        addLog('Starting test...')
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
                        <Send className="w-4 h-4" />
                        Test Push Notification
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Force a push notification to this device immediately.
                    </p>
                    <Button onClick={handleTestPush} disabled={loading} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Test Push
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-slate-950 text-slate-50 p-4 rounded-md font-mono text-xs overflow-x-auto h-48">
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
