'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Utensils } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DiningNav() {
    const pathname = usePathname()
    const isActive = pathname === '/dining' || pathname.startsWith('/dining/')

    return (
        <Link
            href="/dining"
            className={cn(
                "flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-gray-900"
            )}
        >
            <Utensils className="w-5 h-5" />
            <span className="text-[10px] font-medium">Dining</span>
        </Link>
    )
}
