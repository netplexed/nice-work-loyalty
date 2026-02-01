import { createAdminClient } from '@/lib/supabase/admin'
import { LotteryDrawing, LotteryEntry } from './types'

// Setup crypto for random values
const crypto = globalThis.crypto

export async function executeDrawing(drawingId: string) {
    const supabase = createAdminClient()

    // 1. Get all entries for this drawing
    const { data: entries, error: entriesError } = await supabase
        .from('lottery_entries')
        .select('*')
        .eq('drawing_id', drawingId) as any

    if (entriesError) throw new Error(`Failed to fetch entries: ${entriesError.message}`)

    // 2. Get the drawing details
    const { data: drawing, error: drawingError } = await supabase
        .from('lottery_drawings')
        .select('*')
        .eq('id', drawingId)
        .single() as any

    if (drawingError) throw new Error(`Failed to fetch drawing: ${drawingError.message}`)
    if (!drawing) throw new Error('Drawing not found')
    if (drawing.status !== 'active') throw new Error('Drawing is not active')

    // 3. Build ticket pool (weighted by quantity)
    // Each entry gets sequential ticket numbers
    const ticketPool: { userId: string; ticketNumber: number }[] = []
    let ticketCounter = 0

    // Group by user first to ensure consistent fair distribution logic (just in case)
    const userEntries = new Map<string, number>()
    entries?.forEach((entry: any) => {
        const current = userEntries.get(entry.user_id) || 0
        userEntries.set(entry.user_id, current + entry.quantity)
    })

    // Assign ticket numbers
    for (const [userId, count] of userEntries) {
        for (let i = 0; i < count; i++) {
            ticketPool.push({ userId, ticketNumber: ticketCounter++ })
        }
    }

    const totalTickets = ticketCounter

    if (totalTickets === 0) {
        // Handle no entries case
        await (supabase
            .from('lottery_drawings')
            .update({
                status: 'drawn',
                total_entries: 0,
                total_participants: 0,
                drawn_at: new Date().toISOString()
            })
            .eq('id', drawingId) as any)

        return { winner: null, totalTickets: 0 }
    }

    // 4. Generate cryptographically secure random number
    const randomBytes = new Uint32Array(1)
    crypto.getRandomValues(randomBytes)
    const randomSeed = randomBytes[0].toString()
    // Use modulo providing totalTickets fits in Uint32 (4 billion), otherwise need BigInt logic
    // For < 500,000 entries, this is perfectly fine.
    const winningTicket = randomBytes[0] % totalTickets

    // 5. Find winner
    const winnerEntry = ticketPool.find(t => t.ticketNumber === winningTicket)

    if (!winnerEntry) {
        throw new Error('No winner found - drawing error')
    }

    // 6. Generate voucher code
    const voucherCode = generateVoucherCode()
    const voucherExpiry = new Date()
    voucherExpiry.setDate(voucherExpiry.getDate() + 30) // 30 days validity

    // 7. Save results (Sequential operations since we don't have client-side transactions)
    // In a real prod environment, we would use an RPC for atomicity.

    // Insert winner record
    const { error: winnerError } = await (supabase
        .from('lottery_winners')
        .insert({
            drawing_id: drawingId,
            user_id: winnerEntry.userId,
            prize_rank: 1,
            prize_description: drawing.prize_description,
            prize_value: drawing.prize_value,
            voucher_code: voucherCode,
            voucher_expiry_date: voucherExpiry.toISOString()
        }) as any)

    if (winnerError) throw new Error(`Failed to insert winner: ${winnerError.message}`)

    // Update drawing record
    const { error: updateError } = await (supabase
        .from('lottery_drawings')
        .update({
            status: 'drawn',
            winning_ticket_number: winningTicket,
            random_seed: randomSeed,
            drawn_at: new Date().toISOString(),
            total_entries: totalTickets,
            total_participants: userEntries.size
        })
        .eq('id', drawingId) as any)

    if (updateError) throw new Error(`Failed to update drawing: ${updateError.message}`)

    // Calculate stats
    // We can do this async or here. Let's do it here.
    const stats = calculateStats(entries || [], drawingId, totalTickets, userEntries, drawing)

    await (supabase.from('lottery_stats').insert(stats) as any)

    return {
        winner: { userId: winnerEntry.userId, voucherCode },
        totalTickets,
        winningTicket
    }
}

function generateVoucherCode(): string {
    const prefix = 'LUCKY'
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `${prefix}${random}`
}

function calculateStats(entries: any[], drawingId: string, totalTickets: number, userEntries: Map<string, number>, drawing: any) {
    const purchasedCount = entries
        .filter(e => e.entry_type === 'purchased')
        .reduce((sum, e) => sum + e.quantity, 0)

    const visitCount = entries
        .filter(e => e.entry_type === 'visit')
        .reduce((sum, e) => sum + e.quantity, 0)

    const checkinCount = entries
        .filter(e => e.entry_type === 'checkin')
        .reduce((sum, e) => sum + e.quantity, 0)

    const baseCount = entries
        .filter(e => e.entry_type === 'base')
        .reduce((sum, e) => sum + e.quantity, 0)

    const totalNiceSpent = entries
        .reduce((sum, e) => sum + (e.nice_spent || 0), 0)

    return {
        drawing_id: drawingId,
        total_participants: userEntries.size,
        total_entries: totalTickets,
        total_nice_spent: totalNiceSpent,
        avg_entries_per_user: userEntries.size > 0 ? totalTickets / userEntries.size : 0,
        entries_purchased: purchasedCount,
        entries_visit: visitCount,
        entries_checkin: checkinCount,
        entries_base: baseCount
    }
}
