import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApiContext } from '@/lib/admin/api-auth'
import { getAdminUserById } from '@/lib/admin/admin-users'

type QueryError = { message: string } | null

function buildInviteRedirectTo(req: Request) {
    const origin = req.headers.get('origin')
    if (origin) {
        return new URL('/auth/callback?next=/update-password', origin).toString()
    }

    const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host')
    if (forwardedHost) {
        const protocol = req.headers.get('x-forwarded-proto') || 'https'
        return `${protocol}://${forwardedHost}/auth/callback?next=/update-password`
    }

    const fallback = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    return new URL('/auth/callback?next=/update-password', fallback).toString()
}

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const guard = await requireAdminApiContext({ minimumRole: 'super_admin' })
    if (!guard.ok) return guard.response

    const { id } = await context.params
    if (!id) {
        return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }

    const targetAdmin = await getAdminUserById(id)
    if (!targetAdmin) {
        return NextResponse.json({ error: 'Admin user not found' }, { status: 404 })
    }

    if (targetAdmin.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending users can be re-invited' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    const inviteRedirectTo = buildInviteRedirectTo(req)
    const { error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(targetAdmin.email, {
        redirectTo: inviteRedirectTo,
        data: {
            role: targetAdmin.role,
            full_name: targetAdmin.full_name,
            account_type: 'admin',
        }
    })

    if (inviteError) {
        return NextResponse.json({ error: inviteError.message }, { status: 400 })
    }

    const nowIso = new Date().toISOString()

    const { error: updateError } = await (adminSupabase.from('admin_users') as unknown as {
        update: (values: { invited_at: string, invited_by: string, updated_at: string }) => {
            eq: (column: string, value: string) => Promise<{ error: QueryError }>
        }
    })
        .update({
            invited_at: nowIso,
            invited_by: guard.context.userId,
            updated_at: nowIso,
        })
        .eq('id', id)

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await (adminSupabase.from('admin_audit_log') as unknown as {
        insert: (values: {
            admin_user_id: string
            actor_admin_id: string
            action: string
            metadata: { email: string, role: string }
        }) => Promise<{ error: QueryError }>
    }).insert({
        admin_user_id: id,
        actor_admin_id: guard.context.userId,
        action: 'invite_resent',
        metadata: { email: targetAdmin.email, role: targetAdmin.role },
    })

    return NextResponse.json({ message: 'Invitation resent' })
}
