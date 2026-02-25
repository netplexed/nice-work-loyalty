import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApiContext } from '@/lib/admin/api-auth'
import type { AdminRole } from '@/lib/admin/permissions'
import { countActiveSuperAdmins, getAdminUserById } from '@/lib/admin/admin-users'

type UpdateRoleBody = {
    role?: AdminRole
}

type QueryError = { message: string } | null

function isValidRole(role: unknown): role is AdminRole {
    return role === 'super_admin' || role === 'manager' || role === 'staff'
}

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const guard = await requireAdminApiContext({ minimumRole: 'super_admin' })
    if (!guard.ok) return guard.response

    const { id } = await context.params
    if (!id) {
        return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }

    if (id === guard.context.userId) {
        return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    let body: UpdateRoleBody
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!isValidRole(body.role)) {
        return NextResponse.json({ error: 'Invalid role value' }, { status: 400 })
    }

    const targetAdmin = await getAdminUserById(id)
    if (!targetAdmin) {
        return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })
    }

    if (targetAdmin.role === 'super_admin' && body.role !== 'super_admin') {
        const otherSuperAdmins = await countActiveSuperAdmins(id)
        if (otherSuperAdmins < 1) {
            return NextResponse.json({ error: 'Cannot demote the last Super Admin' }, { status: 400 })
        }
    }

    const adminSupabase = createAdminClient()
    const { data: updatedRow, error: updateError } = await (adminSupabase.from('admin_users') as unknown as {
        update: (values: { role: AdminRole, updated_at: string }) => {
            eq: (column: string, value: string) => {
                select: (columns: string) => {
                    single: () => Promise<{
                        data: {
                            id: string
                            email: string
                            full_name: string
                            role: AdminRole
                            status: string
                            invited_at: string | null
                            last_login_at: string | null
                            created_at: string
                        } | null
                        error: QueryError
                    }>
                }
            }
        }
    })
        .update({
            role: body.role,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id,email,full_name,role,status,invited_at,last_login_at,created_at')
        .single()

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    if (!updatedRow) {
        return NextResponse.json({ error: 'Updated user not returned' }, { status: 500 })
    }

    await adminSupabase.auth.admin.updateUserById(id, {
        user_metadata: {
            role: body.role,
            full_name: updatedRow.full_name,
            account_type: 'admin',
        }
    })

    await (adminSupabase.from('admin_audit_log') as unknown as {
        insert: (values: {
            admin_user_id: string
            actor_admin_id: string
            action: string
            previous_value: string
            new_value: string
            metadata: { email: string }
        }) => Promise<{ error: QueryError }>
    }).insert({
        admin_user_id: id,
        actor_admin_id: guard.context.userId,
        action: 'role_changed',
        previous_value: targetAdmin.role,
        new_value: body.role,
        metadata: { email: targetAdmin.email },
    })

    return NextResponse.json({ user: updatedRow })
}
