import { verifyAdmin } from '@/app/actions/admin-actions'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

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
        <div className="flex h-screen bg-gray-100 dark:bg-zinc-950">
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto p-8">
                {children}
            </main>
        </div>
    )
}
