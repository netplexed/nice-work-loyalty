
import dotenv from 'dotenv'
import path from 'path'

// Load env before importing anything else
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

console.log('Env loaded:', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'Yes' : 'No')

import { createClient } from '@supabase/supabase-js'

// Need to mock environment variables if running directly with ts-node, 
// or run this within the Next.js context (extensions/scripts).
// For now, assuming we run it via a script runner that loads env.

async function testLottery() {
    // Dynamic imports to ensure env is loaded
    const { createAdminClient } = await import('../lib/supabase/admin')
    const { executeDrawing } = await import('../lib/lottery/drawing-logic')

    const supabase = createAdminClient()

    console.log('Starting Test...')

    // 1. Get a test user (Howard's ID if possible, or any user)
    const { data: users } = await supabase.from('profiles').select('id, email').limit(1)
    const user = users?.[0]

    if (!user) throw new Error('No user found')
    console.log('Test User:', user.id, user.email)

    // Get initial balance
    const { data: initialAccount } = await supabase.from('nice_accounts').select('nice_collected_balance').eq('user_id', user.id).single()
    const initialBalance = initialAccount?.nice_collected_balance || 0
    console.log('Initial Balance:', initialBalance)

    // 2. Create a test drawing
    const drawDate = new Date()
    drawDate.setMinutes(drawDate.getMinutes() + 1)

    const { data: drawing, error: drawingError } = await (supabase.from('lottery_drawings') as any).insert({
        draw_date: drawDate.toISOString(),
        week_start_date: new Date().toISOString(),
        prize_tier: 'standard',
        prize_description: 'Test Verification 500 Loyalty Points',
        prize_value: 500,
        status: 'active',
        prize_type: 'points'
    }).select().single()

    if (drawingError) throw new Error('Failed to create drawing: ' + drawingError.message)
    console.log('Created Drawing:', drawing.id)

    // 3. Enter user into drawing
    const { error: entryError } = await (supabase.from('lottery_entries') as any).insert({
        drawing_id: drawing.id,
        user_id: user.id,
        entry_type: 'base',
        quantity: 1
    })

    if (entryError) console.error('Entry Error', entryError)

    // 4. Executing Drawing
    console.log('Executing Drawing...')
    try {
        await executeDrawing(drawing.id)
    } catch (e) {
        console.error('Execution Failed:', e)
        return
    }

    // 5. Verify
    const { data: winner } = await (supabase.from('lottery_winners') as any).select('*').eq('drawing_id', drawing.id).single()
    console.log('Winner:', winner)

    const { data: notification } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single()
    console.log('Latest Notification:', notification)

    if (notification && notification.type === 'system' && notification.title.includes('won')) {
        console.log('✅ Notification verified')
    } else {
        console.log('❌ Notification missing or incorrect')
    }

    // Check Balance
    // Check Points Transaction
    const { data: pointsTx } = await supabase.from('points_transactions').select('*').eq('user_id', user.id).eq('transaction_type', 'earned_lottery').order('created_at', { ascending: false }).limit(1).single()
    console.log('Points Transaction:', pointsTx)

    if (pointsTx && pointsTx.points === 500) {
        console.log('✅ Points awarded correctly')
    } else {
        console.log('❌ Points NOT awarded correctly')
    }
}

testLottery()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
