import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminUserById } from '@/lib/admin/admin-users'
import { hasMinimumRole, isActiveAdminStatus, type AdminRole } from '@/lib/admin/permissions'

export type AdminApiContext = {
    userId: string
    role: AdminRole
}

type GuardOptions = {
    minimumRole?: AdminRole
}

type GuardResult =
    | { ok: true, context: AdminApiContext }
    | { ok: false, response: NextResponse }

export async function requireAdminApiContext(options: GuardOptions = {}): Promise<GuardResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    const admin = await getAdminUserById(user.id)
    if (!admin) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
    }

    if (!isActiveAdminStatus(admin.status)) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Account disabled' }, { status: 403 })
        }
    }

    if (options.minimumRole && !hasMinimumRole(admin.role, options.minimumRole)) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Insufficient role' }, { status: 403 })
        }
    }

    return {
        ok: true,
        context: {
            userId: user.id,
            role: admin.role,
        }
    }
}
