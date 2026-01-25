'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Gift, Settings, LogOut, Scan, QrCode, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function AdminSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const links = [
        { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
        { href: '/admin/users', icon: Users, label: 'Users' },
        { href: '/admin/rewards', icon: Gift, label: 'Rewards' },
        { href: '/admin/redeem', icon: Scan, label: 'Redeem' },
        { href: '/admin/pos', icon: DollarSign, label: 'POS / Record' },
        { href: '/admin/settings', icon: Settings, label: 'Settings' },
    ]

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="w-64 bg-slate-900 h-screen flex flex-col text-slate-300">
            <div className="p-6 border-b border-slate-800">
                <h2 className="text-xl font-bold text-white tracking-tight">Nice Work Admin</h2>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {links.map((link) => {
                    const isActive = pathname === link.href
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <link.icon className="w-5 h-5" />
                            <span className="font-medium">{link.label}</span>
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    onClick={handleLogout}
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    Sign Out
                </Button>
            </div>
        </div>
    )
}
