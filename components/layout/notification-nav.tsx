'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Bell } from 'lucide-react'
import { getUnreadCount } from '@/app/actions/messaging-actions'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function NotificationNav() {
    const { data: count = 0, mutate } = useSWR('unread-notifications', getUnreadCount, {
        refreshInterval: 30000 // Poll every 30s as backup
    })
    const pathname = usePathname()
    const isActive = pathname === '/notifications'

    useEffect(() => {
        const supabase = createClient()
        let channel: any

        const setupRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            channel = supabase
                .channel('notification-badge')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`
                    },
                    () => {
                        console.log('Realtime notification received, refreshing badge...')
                        mutate()
                    }
                )
                .subscribe()
        }

        setupRealtime()

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [mutate])

    return (
        <Link
            href="/notifications"
            className={cn(
                "flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-gray-900"
            )}
        >
            <div className="relative">
                <Bell className="w-5 h-5" />
                {count > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                        {count > 9 ? '9+' : count}
                    </span>
                )}
            </div>
            <span className="text-[10px] font-medium">Alerts</span>
        </Link>
    )
}
