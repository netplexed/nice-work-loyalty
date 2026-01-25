import { verifyAdmin } from '@/app/actions/admin-actions'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

import { AdminMobileNav } from '@/components/admin/admin-mobile-nav'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const isAdmin = await verifyAdmin()

    if (!isAdmin) {
        redirect('/')
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100 dark:bg-zinc-950 md:flex-row">
            {/* Desktop Sidebar */}
            <div className="hidden md:block w-64 shrink-0 h-full">
                <AdminSidebar />
            </div>

            {/* Mobile Header */}
            <AdminMobileNav />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                {children}
            </main>
        </div>
    )
}
