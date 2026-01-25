'use client'

import React from 'react'
import Link from 'next/link'
import { Scan, Gift, User } from 'lucide-react'

interface QuickActionsProps {
    onCheckInSuccess?: (visitCount: number, multiplier: number) => void
}

export function QuickActions({ onCheckInSuccess }: QuickActionsProps) {
    const actions = [
        { href: '/scan', icon: Scan, label: 'Scan' },
        { href: '/rewards', icon: Gift, label: 'Rewards' },
        { href: '/profile', icon: User, label: 'Profile' },
    ]

    return (
        <div className="grid grid-cols-3 gap-4">
            {actions.map((action) => (
                <Link
                    key={action.label}
                    href={action.href}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 group-active:scale-95 transition-all duration-200 ease-spring">
                        <action.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{action.label}</span>
                </Link>
            ))}
        </div>
    )
}
