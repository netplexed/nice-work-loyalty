import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function isMissingColumnError(error: { code?: string, message?: string } | null) {
    if (!error) return false
    if (error.code === '42703' || error.code === 'PGRST204') return true

    const message = (error.message || '').toLowerCase()
    return (
        (message.includes('column') && message.includes('does not exist')) ||
        (message.includes('could not find') && message.includes('schema cache'))
    )
}

function sanitizeNextPath(next: string | null) {
    if (!next || !next.startsWith('/')) return '/'
    return next
}

function redirectWithHost(request: Request, pathname: string) {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'

    if (isLocalEnv) {
        return NextResponse.redirect(new URL(pathname, request.url))
    }
    if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${pathname}`)
    }
    return NextResponse.redirect(new URL(pathname, request.url))
}

type AdminRow = {
    role: string
    status?: string | null
    active?: boolean | null
}

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const nextPath = sanitizeNextPath(requestUrl.searchParams.get('next'))

    if (code) {
        const supabase = await createClient()
        const { error, data } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data?.session?.user) {
            const user = data.session.user

            const adminProbe = await supabase
                .from('admin_users')
                .select('id, role, status, active')
                .eq('id', user.id)
                .maybeSingle()

            let adminRecord: AdminRow | null = null
            if (!adminProbe.error) {
                adminRecord = adminProbe.data as AdminRow | null
            } else if (isMissingColumnError(adminProbe.error)) {
                const fallback = await supabase
                    .from('admin_users')
                    .select('id, role, active')
                    .eq('id', user.id)
                    .maybeSingle()
                if (!fallback.error) {
                    adminRecord = fallback.data as AdminRow | null
                }
            }

            let isActiveAdmin = !!adminRecord && (
                typeof adminRecord.status === 'string'
                    ? adminRecord.status === 'active'
                    : !!adminRecord.active
            )

            // Invited admins begin as "pending". Promote them to "active" once the invite token is verified.
            if (
                adminRecord &&
                adminRecord.status === 'pending' &&
                process.env.SUPABASE_SERVICE_ROLE_KEY
            ) {
                const adminSupabase = createAdminClient()
                const nowIso = new Date().toISOString()

                const { data: activatedRow } = await (adminSupabase.from('admin_users') as unknown as {
                    update: (values: {
                        status: 'active'
                        active: boolean
                        last_login_at: string
                        updated_at: string
                    }) => {
                        eq: (column: string, value: string) => {
                            eq: (column: string, value: string) => {
                                select: (columns: string) => {
                                    maybeSingle: () => Promise<{ data: AdminRow | null, error: { message?: string } | null }>
                                }
                            }
                        }
                    }
                })
                    .update({
                        status: 'active',
                        active: true,
                        last_login_at: nowIso,
                        updated_at: nowIso,
                    })
                    .eq('id', user.id)
                    .eq('status', 'pending')
                    .select('role,status,active')
                    .maybeSingle()

                if (activatedRow) {
                    adminRecord = activatedRow
                    isActiveAdmin = true
                }
            }

            if (adminRecord) {
                if (nextPath.startsWith('/update-password')) {
                    return redirectWithHost(request, nextPath)
                }

                if (isActiveAdmin) {
                    const adminRedirect = adminRecord.role === 'staff' ? '/admin/redeem' : '/admin'
                    return redirectWithHost(request, adminRedirect)
                }

                return redirectWithHost(request, '/admin-login?error=disabled')
            }

            // Automatically provision the public profile if this is a new OAuth user
            // Upsert will gracefully ignore if the profile already exists.
            await supabase.from('profiles').upsert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
                updated_at: new Date().toISOString(),
                // these defaults match the onboarding process
                points_balance: 50,
                tier: 'bronze',
                total_visits: 0,
                total_spent: 0
            }, { onConflict: 'id', ignoreDuplicates: true })

            // Fetch the profile to check if birthday is missing
            const { data: profile } = await supabase.from('profiles').select('birthday').eq('id', user.id).maybeSingle()

            let redirectUrl = nextPath
            if (!profile?.birthday) {
                redirectUrl = '/onboarding'
            }

            return redirectWithHost(request, redirectUrl)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(new URL('/login?error=auth-failure', request.url))
}
