
import { NextRequest, NextResponse } from 'next/server'
import { processAutomations } from '@/lib/automations/process-automations'

export async function GET(req: NextRequest) {
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
            error: e.message,
            stack: e.stack
        }, { status: 500 })
    }
}
