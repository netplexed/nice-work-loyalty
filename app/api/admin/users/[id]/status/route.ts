import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApiContext } from '@/lib/admin/api-auth'
import { countActiveSuperAdmins, getAdminUserById } from '@/lib/admin/admin-users'

type UpdateStatusBody = {
    status?: 'active' | 'disabled'
}

type QueryError = { message: string } | null

function isValidStatus(status: unknown): status is 'active' | 'disabled' {
    return status === 'active' || status === 'disabled'
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
        return NextResponse.json({ error: 'Cannot modify your own account status' }, { status: 400 })
    }

    let body: UpdateStatusBody
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!isValidStatus(body.status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const targetAdmin = await getAdminUserById(id)
    if (!targetAdmin) {
        return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })
    }

    if (targetAdmin.role === 'super_admin' && body.status === 'disabled') {
        const otherSuperAdmins = await countActiveSuperAdmins(id)
        if (otherSuperAdmins < 1) {
            return NextResponse.json({ error: 'Cannot disable the last Super Admin' }, { status: 400 })
        }
    }

    const adminSupabase = createAdminClient()
    const { data: updatedRow, error: updateError } = await (adminSupabase.from('admin_users') as unknown as {
        update: (values: { status: 'active' | 'disabled', updated_at: string }) => {
            eq: (column: string, value: string) => {
                select: (columns: string) => {
                    single: () => Promise<{
                        data: {
                            id: string
                            email: string
                            full_name: string
                            role: string
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
            status: body.status,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id,email,full_name,role,status,invited_at,last_login_at,created_at')
        .single()

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { error: authUpdateError } = await adminSupabase.auth.admin.updateUserById(id, {
        ban_duration: body.status === 'disabled' ? '876000h' : 'none',
    })
    if (authUpdateError) {
        return NextResponse.json({ error: authUpdateError.message }, { status: 500 })
    }

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
        action: 'status_changed',
        previous_value: targetAdmin.status,
        new_value: body.status,
        metadata: { email: targetAdmin.email },
    })

    return NextResponse.json({ user: updatedRow })
}
