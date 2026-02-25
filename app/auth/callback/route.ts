import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function isMissingColumnError(error: { code?: string, message?: string } | null) {
    if (!error) return false
    if (error.code === '42703' || error.code === 'PGRST204') return true

    const message = (error.message || '').toLowerCase()
    return (
        (message.includes('column') && message.includes('does not exist')) ||
        (message.includes('could not find') && message.includes('schema cache'))
    )
}

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/'

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

            let adminRecord: { role: string, status?: string | null, active?: boolean | null } | null = null
            if (!adminProbe.error) {
                adminRecord = adminProbe.data as { role: string, status?: string | null, active?: boolean | null } | null
            } else if (isMissingColumnError(adminProbe.error)) {
                const fallback = await supabase
                    .from('admin_users')
                    .select('id, role, active')
                    .eq('id', user.id)
                    .maybeSingle()
                if (!fallback.error) {
                    adminRecord = fallback.data as { role: string, active?: boolean | null } | null
                }
            }

            const isActiveAdmin = !!adminRecord && (
                typeof adminRecord.status === 'string'
                    ? adminRecord.status === 'active'
                    : !!adminRecord.active
            )

            if (isActiveAdmin) {
                const adminRedirect = adminRecord?.role === 'staff' ? '/admin/redeem' : '/admin'
                const forwardedHost = request.headers.get('x-forwarded-host')
                const isLocalEnv = process.env.NODE_ENV === 'development'
                if (isLocalEnv) {
                    return NextResponse.redirect(new URL(adminRedirect, request.url))
                } else if (forwardedHost) {
                    return NextResponse.redirect(`https://${forwardedHost}${adminRedirect}`)
                } else {
                    return NextResponse.redirect(new URL(adminRedirect, request.url))
                }
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

            let redirectUrl = next
            if (!profile?.birthday) {
                redirectUrl = '/onboarding'
            }

            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                return NextResponse.redirect(new URL(redirectUrl, request.url))
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${redirectUrl}`)
            } else {
                return NextResponse.redirect(new URL(redirectUrl, request.url))
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(new URL('/login?error=auth-failure', request.url))
}
