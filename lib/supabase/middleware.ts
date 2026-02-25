import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function isMissingColumnError(error: { code?: string, message?: string } | null) {
    if (!error) return false
    if (error.code === '42703' || error.code === 'PGRST204') return true

    const message = (error.message || '').toLowerCase()
    return (
        (message.includes('column') && message.includes('does not exist')) ||
        (message.includes('could not find') && message.includes('schema cache'))
    )
}

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, {
                            ...options,
                            maxAge: 60 * 60 * 24 * 365, // Force 1 year
                        })
                    )
                },
            },
            cookieOptions: {
                maxAge: 60 * 60 * 24 * 365,
                name: 'sb-auth-token',
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
            }
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

    if (
        !user &&
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/admin-login') &&
        !request.nextUrl.pathname.startsWith('/forgot-password') &&
        !request.nextUrl.pathname.startsWith('/update-password') &&
        !request.nextUrl.pathname.startsWith('/onboarding') &&
        !request.nextUrl.pathname.startsWith('/auth') &&
        !request.nextUrl.pathname.startsWith('/legal')
    ) {
        // no user, potentially respond by redirecting the user to the login page
        const url = request.nextUrl.clone()
        url.pathname = isAdminRoute ? '/admin-login' : '/login'
        return NextResponse.redirect(url)
    }

    if (user && isAdminRoute) {
        const primary = await supabase
            .from('admin_users')
            .select('id, role, status, active')
            .eq('id', user.id)
            .maybeSingle()

        let adminRow: { id: string, role: string, status?: string | null, active?: boolean | null } | null = null
        let adminError = primary.error

        if (!primary.error) {
            adminRow = primary.data as { id: string, role: string, status?: string | null, active?: boolean | null } | null
        } else if (isMissingColumnError(primary.error)) {
            const fallback = await supabase
                .from('admin_users')
                .select('id, role, active')
                .eq('id', user.id)
                .maybeSingle()

            adminError = fallback.error
            adminRow = (fallback.data as { id: string, role: string, active?: boolean | null } | null) || null
        }

        if (adminError || !adminRow) {
            const url = request.nextUrl.clone()
            url.pathname = '/admin-login'
            url.searchParams.set('error', 'forbidden')
            return NextResponse.redirect(url)
        }

        const isActive = typeof adminRow.status === 'string'
            ? adminRow.status === 'active'
            : !!adminRow.active

        if (!isActive) {
            const url = request.nextUrl.clone()
            url.pathname = '/admin-login'
            url.searchParams.set('error', 'disabled')
            return NextResponse.redirect(url)
        }

        if (adminRow.role === 'staff') {
            const path = request.nextUrl.pathname
            const staffAllowed = path.startsWith('/admin/redeem') || path.startsWith('/admin/pos')

            if (!staffAllowed) {
                const url = request.nextUrl.clone()
                url.pathname = '/admin/redeem'
                return NextResponse.redirect(url)
            }
        }
    }

    return supabaseResponse
}
