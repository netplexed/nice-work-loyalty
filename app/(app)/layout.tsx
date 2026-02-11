'use client'

import Link from 'next/link'
import { Home, Gift, User } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NotificationNav } from '@/components/layout/notification-nav'
import { DiningNav } from '@/components/layout/dining-nav'

export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-gray-50/50">
            <main className="max-w-md mx-auto min-h-screen bg-white shadow-xl overflow-hidden relative">
                {children}

                {/* Bottom Navigation */}
                <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe">
                    <div className="max-w-md mx-auto flex items-center justify-around h-16">
                        <NavItem href="/" icon={Home} label="Home" />
                        <DiningNav />
                        <NavItem href="/rewards" icon={Gift} label="Rewards" />
                        <NotificationNav />
                        <NavItem href="/profile" icon={User} label="Profile" />
                    </div>
                </nav>
            </main>
        </div>
    )
}

function NavItem({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
    const pathname = usePathname()
    const isActive = pathname === href

    return (
        <Link
            href={href}
            className={cn(
                "flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-gray-900"
            )}
        >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
        </Link>
    )
}
