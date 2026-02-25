import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApiContext } from '@/lib/admin/api-auth'
import type { AdminRole } from '@/lib/admin/permissions'
import type { User } from '@supabase/supabase-js'

type InviteBody = {
    email?: string
    full_name?: string
    role?: AdminRole
}

type QueryError = { message: string } | null
type AuthError = { message?: string } | null

function isValidRole(role: unknown): role is AdminRole {
    return role === 'super_admin' || role === 'manager' || role === 'staff'
}

function normalizeEmail(email: string) {
    return email.trim().toLowerCase()
}

function isAlreadyRegisteredError(message: string | undefined) {
    const normalized = (message || '').toLowerCase()
    return normalized.includes('already been registered') || normalized.includes('already registered')
}

function buildInviteRedirectTo(req: Request) {
    const origin = req.headers.get('origin')
    if (origin) {
        return new URL('/update-password', origin).toString()
    }

    const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host')
    if (forwardedHost) {
        const protocol = req.headers.get('x-forwarded-proto') || 'https'
        return `${protocol}://${forwardedHost}/update-password`
    }

    const fallback = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    return new URL('/update-password', fallback).toString()
}

async function findAuthUserByEmail(
    adminSupabase: ReturnType<typeof createAdminClient>,
    email: string
) {
    const normalizedEmail = normalizeEmail(email)
    const perPage = 200

    for (let page = 1; page <= 20; page += 1) {
        const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage })
        if (error) {
            return { data: null as User | null, error }
        }

        const users = data?.users || []
        const matched = users.find((user) => normalizeEmail(user.email || '') === normalizedEmail)
        if (matched) {
            return { data: matched, error: null as AuthError }
        }

        if (users.length < perPage) break
    }

    return { data: null as User | null, error: null as AuthError }
}

export async function POST(req: Request) {
    const guard = await requireAdminApiContext({ minimumRole: 'super_admin' })
    if (!guard.ok) return guard.response

    let body: InviteBody
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const email = body.email ? normalizeEmail(body.email) : ''
    const fullName = (body.full_name || '').trim()
    const role = body.role

    if (!email || !fullName || !isValidRole(role)) {
        return NextResponse.json({ error: 'invalid input' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    const { data: existingAdmin, error: existingError } = await (adminSupabase.from('admin_users') as unknown as {
        select: (columns: string) => {
            ilike: (column: string, value: string) => {
                maybeSingle: () => Promise<{ data: { id: string } | null, error: QueryError }>
            }
        }
    })
        .select('id')
        .ilike('email', email)
        .maybeSingle()

    if (existingError) {
        return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    if (existingAdmin) {
        return NextResponse.json({ error: 'email already exists' }, { status: 409 })
    }

    const inviteRedirectTo = buildInviteRedirectTo(req)
    const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: inviteRedirectTo,
        data: {
            role,
            full_name: fullName,
            account_type: 'admin',
        }
    })

    let userId = inviteData?.user?.id || null
    let deliveryMethod: 'invite' | 'password_reset' = 'invite'

    if (inviteError || !userId) {
        if (!isAlreadyRegisteredError(inviteError?.message)) {
            const message = inviteError?.message || 'Failed to send invitation'
            return NextResponse.json({ error: message }, { status: 400 })
        }

        const { error: resetError } = await adminSupabase.auth.resetPasswordForEmail(email, {
            redirectTo: inviteRedirectTo,
        })
        if (resetError) {
            return NextResponse.json({ error: resetError.message || 'Failed to send password setup email' }, { status: 400 })
        }

        const { data: existingAuthUser, error: lookupError } = await findAuthUserByEmail(adminSupabase, email)
        if (lookupError || !existingAuthUser?.id) {
            return NextResponse.json({ error: lookupError?.message || 'Could not resolve existing auth user' }, { status: 400 })
        }

        userId = existingAuthUser.id
        deliveryMethod = 'password_reset'
    }

    const nowIso = new Date().toISOString()

    const { error: upsertError } = await (adminSupabase.from('admin_users') as unknown as {
        upsert: (
            values: {
                id: string
                email: string
                full_name: string
                role: AdminRole
                status: 'pending'
                invited_by: string
                invited_at: string
                updated_at: string
            },
            options: { onConflict: string }
        ) => Promise<{ error: QueryError }>
    })
        .upsert({
            id: userId,
            email,
            full_name: fullName,
            role,
            status: 'pending',
            invited_by: guard.context.userId,
            invited_at: nowIso,
            updated_at: nowIso,
        }, { onConflict: 'id' })

    if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    await (adminSupabase.from('admin_audit_log') as unknown as {
        insert: (values: {
            admin_user_id: string
            actor_admin_id: string
            action: string
            metadata: { email: string, role: AdminRole, delivery: 'invite' | 'password_reset' }
        }) => Promise<{ error: QueryError }>
    }).insert({
        admin_user_id: userId,
        actor_admin_id: guard.context.userId,
        action: 'invited',
        metadata: { email, role, delivery: deliveryMethod },
    })

    const message = deliveryMethod === 'invite'
        ? 'Invitation sent'
        : 'Password setup email sent to existing account'

    return NextResponse.json({ message, user_id: userId }, { status: 201 })
}
