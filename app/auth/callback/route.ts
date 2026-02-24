import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error, data } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data?.session?.user) {
            const user = data.session.user

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
            }, { onConflict: 'id', ignoreDuplicates: true }).select()

            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                return NextResponse.redirect(new URL(next, request.url))
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(new URL(next, request.url))
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(new URL('/login?error=auth-failure', request.url))
}
