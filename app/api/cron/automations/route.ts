import { NextRequest, NextResponse } from 'next/server'
import { processAutomations } from '@/lib/automations/process-automations'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }

    if (key !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const result = await processAutomations()
        return NextResponse.json(result)
    } catch (e: any) {
        console.error('Automation error:', e)
        return NextResponse.json({ success: false, error: e.message || 'Unknown error' }, { status: 500 })
    }
}
