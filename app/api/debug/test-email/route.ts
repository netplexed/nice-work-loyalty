
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

async function authorizeDebugRequest(req: NextRequest) {
    const debugEnabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEBUG_ROUTES === 'true'
    if (!debugEnabled) return false

    const debugSecret = process.env.DEBUG_ROUTE_SECRET || process.env.CRON_SECRET
    const authHeader = req.headers.get('authorization')
    if (debugSecret && authHeader === `Bearer ${debugSecret}`) {
        return true
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: admin } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .eq('active', true)
        .maybeSingle()

    return !!admin
}

export async function GET(req: NextRequest) {
    const isAuthorized = await authorizeDebugRequest(req)
    if (!isAuthorized) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    console.log('[Debug Email] Starting test...')

    const key = process.env.RESEND_API_KEY
    const hasKey = !!key
    console.log(`[Debug Email] API key present: ${hasKey}`)

    if (!key) {
        return NextResponse.json({ error: 'Missing RESEND_API_KEY' }, { status: 500 })
    }

    const resend = new Resend(key)

    try {
        const { data, error } = await resend.emails.send({
            from: 'nice work <hello@nicework.sg>',
            to: 'howard@howardlo.com',
            subject: 'PRODUCTION DEBUG TEST',
            html: `
                <h1>Production Debug</h1>
                <p>If you see this, your Vercel Environment Variables and Resend connection are working.</p>
                <p><b>Time:</b> ${new Date().toISOString()}</p>
            `
        })

        if (error) {
            console.error('[Debug Email] Resend Error:', error)
            return NextResponse.json({ success: false, error }, { status: 400 })
        }

        console.log('[Debug Email] Success:', data)
        return NextResponse.json({ success: true, data })
    } catch (e: any) {
        console.error('[Debug Email] Exception:', e)
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
