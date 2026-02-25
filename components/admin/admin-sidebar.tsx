'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Gift, Settings, LogOut, Scan, DollarSign, BarChart3, MessageSquare, Mail, Workflow, LayoutTemplate, GitBranch, Megaphone, Trophy, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { hasMinimumRole, type AdminRole } from '@/lib/admin/permissions'

export function AdminSidebar({ adminRole }: { adminRole: AdminRole }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const links = [
        { href: '/admin', icon: LayoutDashboard, label: 'Overview', minimumRole: 'manager' as AdminRole },
        { href: '/admin/announcements', icon: Megaphone, label: 'Announcements', minimumRole: 'manager' as AdminRole },
        { href: '/admin/users', icon: Users, label: 'Users', minimumRole: 'manager' as AdminRole },
        { href: '/admin/rewards', icon: Gift, label: 'Rewards', minimumRole: 'manager' as AdminRole },
        { href: '/admin/lottery', icon: Sparkles, label: 'Lottery', minimumRole: 'manager' as AdminRole },
        { href: '/admin/rewards/spin-wheel', icon: Trophy, label: 'Spin Wheel', minimumRole: 'manager' as AdminRole },
        { href: '/admin/redeem', icon: Scan, label: 'Redeem', minimumRole: 'staff' as AdminRole },
        { href: '/admin/pos', icon: DollarSign, label: 'POS / Record', minimumRole: 'staff' as AdminRole },
        { href: '/admin/settings', icon: Settings, label: 'Settings', minimumRole: 'super_admin' as AdminRole },
        { href: '/admin/reports', icon: BarChart3, label: 'Reports', minimumRole: 'manager' as AdminRole },
        { href: '/admin/messaging', icon: MessageSquare, label: 'Messaging', minimumRole: 'manager' as AdminRole },
        { href: '/admin/emails', icon: Mail, label: 'Campaigns', minimumRole: 'manager' as AdminRole },
        { href: '/admin/automations', icon: Workflow, label: 'Automations', minimumRole: 'super_admin' as AdminRole },
        { href: '/admin/marketing/templates', icon: LayoutTemplate, label: 'Templates', minimumRole: 'super_admin' as AdminRole },
        { href: '/admin/marketing/workflows', icon: GitBranch, label: 'Workflows', minimumRole: 'super_admin' as AdminRole },
    ].filter((link) => hasMinimumRole(adminRole, link.minimumRole))

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/admin-login')
    }

    return (
        <div className="h-full flex flex-col text-slate-300 bg-slate-900">
            <div className="p-6 border-b border-slate-800">
                <h2 className="text-xl font-bold text-white tracking-tight font-brand">nice work admin</h2>
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
