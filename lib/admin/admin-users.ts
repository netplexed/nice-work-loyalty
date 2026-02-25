import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { AdminRole, AdminStatus } from '@/lib/admin/permissions'

type QueryError = { code?: string, message: string } | null
type UnknownRow = Record<string, unknown>

type SelectListQuery = {
    order: (column: string, options: { ascending: boolean }) => Promise<{ data: UnknownRow[] | null, error: QueryError }>
}

type SelectSingleQuery = {
    eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: UnknownRow | null, error: QueryError }>
    }
}

type CountQuery = {
    eq: (column: string, value: string | boolean) => CountQuery
    neq: (column: string, value: string) => CountQuery
}

export type AdminUserRecord = {
    id: string
    email: string
    full_name: string
    role: AdminRole
    status: AdminStatus
    active: boolean
    invited_by: string | null
    invited_at: string | null
    last_login_at: string | null
    created_at: string | null
    updated_at: string | null
}

function mapAdminRow(row: UnknownRow): AdminUserRecord {
    const role = (row.role as AdminRole | undefined) || 'staff'
    const status = (row.status as AdminStatus | undefined) || ((row.active as boolean | undefined) ? 'active' : 'disabled')

    return {
        id: String(row.id),
        email: String(row.email || ''),
        full_name: String(row.full_name || ''),
        role,
        status,
        active: status === 'active',
        invited_by: (row.invited_by as string | null | undefined) || null,
        invited_at: (row.invited_at as string | null | undefined) || null,
        last_login_at: (row.last_login_at as string | null | undefined) || null,
        created_at: (row.created_at as string | null | undefined) || null,
        updated_at: (row.updated_at as string | null | undefined) || null,
    }
}

async function selectAdminUsersRaw(queryBuilder: {
    select: (columns: string) => SelectListQuery
}) {
    const primaryResult = await queryBuilder
        .select('id,email,full_name,role,status,active,invited_by,invited_at,last_login_at,created_at,updated_at')
        .order('created_at', { ascending: false })

    if (!primaryResult.error) return primaryResult
    if (primaryResult.error.code !== '42703') return primaryResult

    // Fallback for environments that have not run the status/invite migration yet.
    return queryBuilder
        .select('id,email,role,active,created_at')
        .order('created_at', { ascending: false })
}

async function getAdminQueryClient() {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return createAdminClient()
    }
    return createClient()
}

export async function getCurrentAdminUser(): Promise<AdminUserRecord | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const adminUser = await getAdminUserById(user.id)
    return adminUser
}

export async function getAdminUserById(userId: string): Promise<AdminUserRecord | null> {
    const adminSupabase = await getAdminQueryClient()

    const primaryQuery = await (adminSupabase.from('admin_users') as unknown as {
        select: (columns: string) => SelectSingleQuery
    })
        .select('id,email,full_name,role,status,active,invited_by,invited_at,last_login_at,created_at,updated_at')
        .eq('id', userId)
        .maybeSingle()

    if (!primaryQuery.error && primaryQuery.data) return mapAdminRow(primaryQuery.data)
    if (!primaryQuery.error) return null
    if (primaryQuery.error.code !== '42703') {
        throw new Error(primaryQuery.error.message)
    }

    const fallbackQuery = await (adminSupabase.from('admin_users') as unknown as {
        select: (columns: string) => SelectSingleQuery
    })
        .select('id,email,role,active,created_at')
        .eq('id', userId)
        .maybeSingle()

    if (fallbackQuery.error) throw new Error(fallbackQuery.error.message)
    if (!fallbackQuery.data) return null
    return mapAdminRow(fallbackQuery.data)
}

export async function listAdminUsers(): Promise<AdminUserRecord[]> {
    const adminSupabase = await getAdminQueryClient()
    const result = await selectAdminUsersRaw(
        adminSupabase.from('admin_users') as unknown as { select: (columns: string) => SelectListQuery }
    )

    if (result.error) throw new Error(result.error.message)
    const rows = result.data || []
    return rows.map(mapAdminRow)
}

async function countSuperAdminsByStatus(statusColumn: 'status' | 'active', excludingId?: string) {
    const adminSupabase = await getAdminQueryClient()
    let query = (adminSupabase.from('admin_users') as unknown as {
        select: (columns: string, options: { count: 'exact', head: true }) => CountQuery
    })
        .select('*', { count: 'exact', head: true })
        .eq('role', 'super_admin')
        .eq(statusColumn, statusColumn === 'status' ? 'active' : true)

    if (excludingId) {
        query = query.neq('id', excludingId)
    }

    const result = await (query as unknown as Promise<{ count: number | null, error: QueryError }>)
    if (result.error) throw new Error(result.error.message)
    return result.count || 0
}

export async function countActiveSuperAdmins(excludingId?: string) {
    try {
        return await countSuperAdminsByStatus('status', excludingId)
    } catch {
        return countSuperAdminsByStatus('active', excludingId)
    }
}
