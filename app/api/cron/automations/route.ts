import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processAutomations } from '@/lib/automations/process-automations'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')

    // Simple protection: Check for CRON_SECRET or Admin Session
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    // Check Admin
    let isAdmin = false
    if (session) {
        const { data } = await supabase.from('admin_users').select('id').eq('id', session.user.id).eq('active', true).single()
        if (data) isAdmin = true
    }

    if (key !== process.env.CRON_SECRET && !isAdmin) {
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
