
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET(req: NextRequest) {
    console.log('[Debug Email] Starting test...')

    const key = process.env.RESEND_API_KEY
    const hasKey = !!key
    const keyPrefix = key ? key.substring(0, 5) + '...' : 'NONE'

    console.log(`[Debug Email] API Key present: ${hasKey} (${keyPrefix})`)

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
                <p><b>Key Prefix:</b> ${keyPrefix}</p>
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
