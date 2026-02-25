import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApiContext } from '@/lib/admin/api-auth'
import { countActiveSuperAdmins, getAdminUserById } from '@/lib/admin/admin-users'

type QueryError = { message: string } | null

export async function DELETE(
    _req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const guard = await requireAdminApiContext({ minimumRole: 'super_admin' })
    if (!guard.ok) return guard.response

    const { id } = await context.params
    if (!id) {
        return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }

    if (id === guard.context.userId) {
        return NextResponse.json({ error: 'Cannot remove your own admin account' }, { status: 400 })
    }

    const targetAdmin = await getAdminUserById(id)
    if (!targetAdmin) {
        return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })
    }

    if (targetAdmin.role === 'super_admin') {
        const otherSuperAdmins = await countActiveSuperAdmins(id)
        if (otherSuperAdmins < 1) {
            return NextResponse.json({ error: 'Cannot remove the last Super Admin' }, { status: 400 })
        }
    }

    const adminSupabase = createAdminClient()

    const { error: deleteError } = await (adminSupabase.from('admin_users') as unknown as {
        delete: () => {
            eq: (column: string, value: string) => Promise<{ error: QueryError }>
        }
    })
        .delete()
        .eq('id', id)

    if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    await (adminSupabase.from('admin_audit_log') as unknown as {
        insert: (values: {
            admin_user_id: string
            actor_admin_id: string
            action: string
            metadata: {
                removed_admin_id: string
                removed_admin_email: string
                removed_admin_role: string
            }
        }) => Promise<{ error: QueryError }>
    }).insert({
        // Use actor as anchor row so the audit event is retained after target deletion.
        admin_user_id: guard.context.userId,
        actor_admin_id: guard.context.userId,
        action: 'admin_removed',
        metadata: {
            removed_admin_id: id,
            removed_admin_email: targetAdmin.email,
            removed_admin_role: targetAdmin.role,
        },
    })

    return NextResponse.json({ message: 'Admin removed' })
}
