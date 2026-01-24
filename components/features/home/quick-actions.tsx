'use client'

import React from 'react'
import Link from 'next/link'
import { Scan, Gift, User, MapPin } from 'lucide-react'
import { simulateCheckIn } from '@/app/actions/visit-actions'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

interface QuickActionsProps {
    onCheckInSuccess?: (visitCount: number, multiplier: number) => void
}

export function QuickActions({ onCheckInSuccess }: QuickActionsProps) {
    const handleCheckIn = async () => {
        const loadingToast = toast.loading('Checking in against location...')
        try {
            const { success, multiplier, visitCount } = await simulateCheckIn('Tanuki Raw (Orchard)')

            toast.dismiss(loadingToast)

            let message = `Checked in! (Visit #${visitCount} this week)`
            let description = `Nice generation is now ${multiplier}x!`

            if (multiplier >= 3.0) {
                message = "MAX STREAK! 🔥🔥🔥"
                description = "You are earning 3.0x Nice!"
            } else if (multiplier >= 2.0) {
                message = "Double Up! 🔥"
                description = "2nd visit this week! 2.0x Boost active."
            }

            toast.success(message, { description })

            // Trigger confetti
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })

            // Notify parent component for instant UI update
            if (onCheckInSuccess) {
                onCheckInSuccess(visitCount || 1, multiplier)
            }
        } catch (error: any) {
            toast.dismiss(loadingToast)
            toast.error('Check-in failed', { description: error.message })
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
