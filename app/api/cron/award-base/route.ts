import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { LotteryService } from '@/lib/lottery/service'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const supabase = createAdminClient()
        const service = new LotteryService(supabase)

        // Logic to award base entries
        const result = await service.awardBaseEntries()

        return NextResponse.json({ success: true, ...result })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
