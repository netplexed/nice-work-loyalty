import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { LotteryService } from '@/lib/lottery/service'

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { quantity } = await req.json()

        if (!quantity || quantity < 1 || quantity > 10) {
            return NextResponse.json({ error: 'Quantity must be between 1 and 10' }, { status: 400 })
        }

        const service = new LotteryService(supabase)

        // Get active drawing
        const drawing = await service.getCurrentDrawing()
        if (!drawing) {
            return NextResponse.json({ error: 'No active lottery drawing' }, { status: 404 })
        }

        // Purchase
        const result = await service.purchaseEntries(user.id, quantity, drawing.id)

        if (!result.success) {
            return NextResponse.json(result, { status: 400 })
        }

        return NextResponse.json(result)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
