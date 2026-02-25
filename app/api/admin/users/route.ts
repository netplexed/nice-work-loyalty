import { NextResponse } from 'next/server'
import { requireAdminApiContext } from '@/lib/admin/api-auth'
import { listAdminUsers } from '@/lib/admin/admin-users'

export async function GET() {
    const guard = await requireAdminApiContext()
    if (!guard.ok) return guard.response

    try {
        const users = await listAdminUsers()
        return NextResponse.json({
            users: users.map((user) => ({
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                status: user.status,
                invited_at: user.invited_at,
                last_login_at: user.last_login_at,
                created_at: user.created_at,
            }))
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to load admin users'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
