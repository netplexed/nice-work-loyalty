'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getUserNotifications, markNotificationRead, markAllRead } from '@/app/actions/messaging-actions'
import { Bell, Check, MailOpen } from "lucide-react"
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchNotifications = async () => {
        const data = await getUserNotifications()
        setNotifications(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchNotifications()
    }, [])

    const handleMarkRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        await markNotificationRead(id)
    }

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        await markAllRead()
    }

    return (
        <div className="space-y-6 max-w-xl mx-auto pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
                <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
                    <Check className="mr-2 h-4 w-4" />
                    Mark all read
                </Button>
            </div>

            <div className="space-y-3">
                {notifications.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground">
                        <MailOpen className="mx-auto h-12 w-12 opacity-50 mb-4" />
                        <p>No notifications yet.</p>
                    </div>
                )}

                {notifications.map((n) => (
                    <Card
                        key={n.id}
                        className={cn(
                            "transition-colors cursor-pointer hover:bg-slate-50",
                            !n.is_read ? "border-blue-200 bg-blue-50/50" : "opacity-80"
                        )}
                        onClick={() => !n.is_read && handleMarkRead(n.id)}
                    >
                        <CardContent className="p-4 flex gap-4">
                            <div className={cn(
                                "mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                !n.is_read ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                            )}>
                                <Bell className="h-4 w-4" />
                            </div>
                            <div className="space-y-1 flex-1">
                                <div className="flex justify-between items-start">
                                    <p className={cn("font-medium", !n.is_read && "text-blue-900")}>
                                        {n.title}
                                    </p>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                        {new Date(n.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {n.body}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
