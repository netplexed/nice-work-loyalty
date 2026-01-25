'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { getUnreadCount } from '@/app/actions/messaging-actions'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'

export function NotificationNav() {
    const [count, setCount] = useState(0)
    const pathname = usePathname()
    const isActive = pathname === '/notifications'

    useEffect(() => {
        getUnreadCount().then(setCount)
    }, [pathname]) // Re-fetch on nav change (e.g. going back from notifications page)

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
