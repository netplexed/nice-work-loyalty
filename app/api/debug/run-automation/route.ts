import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { processAutomations } from '@/lib/automations/process-automations'
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

    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    const userId = searchParams.get('userId')

    console.log(`[Debug Automation] Triggered for email: ${email}, userId: ${userId}`)

    try {
        const result = await processAutomations(userId || undefined)
        return NextResponse.json({
            success: true,
            result: result.results,
            logs: result.logs,
            timestamp: new Date().toISOString()
        })
    } catch (e: any) {
        console.error('[Debug Automation] Crash:', e)
        return NextResponse.json({
            success: false,
            error: 'Automation debug run failed'
        }, { status: 500 })
    }
}
