'use client'

import React from 'react'
import Link from 'next/link'
import { Scan, Gift, User, MapPin } from 'lucide-react'
import { submitCheckIn } from '@/app/actions/game-actions'
import { toast } from 'sonner'

export function QuickActions() {
    const handleCheckIn = async () => {
        try {
            const result = await submitCheckIn('Tanuki Raw (Orchard)') // Hardcoded for demo
            toast.success(`Checked in! Earned ${result.points} points.`)
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const actions = [
        { href: '/scan', icon: Scan, label: 'Scan' },
        { href: '/rewards', icon: Gift, label: 'Rewards' },
        { onClick: handleCheckIn, icon: MapPin, label: 'Check In' },
        { href: '/profile', icon: User, label: 'Profile' },
    ]

    return (
        <div className="grid grid-cols-4 gap-4">
            {actions.map((action) => (
                action.href ? (
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
                ) : (
                    <button
                        key={action.label}
                        onClick={action.onClick}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 group-active:scale-95 transition-all duration-200 ease-spring">
                            <action.icon className="w-6 h-6 text-primary" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">{action.label}</span>
                    </button>
                )
            ))}
        </div>
    )
}
