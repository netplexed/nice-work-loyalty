import { createAdminClient } from '@/lib/supabase/admin'
import { LotteryDrawing, LotteryEntry } from './types'
import { sendEmail } from '@/lib/email/send-email'
import { sendPushNotification } from '@/lib/push/send-push'

// Setup crypto for random values
// Use crypto helper for random values
const getCrypto = () => {
    if (typeof globalThis !== 'undefined' && globalThis.crypto) return globalThis.crypto
    try {
        return require('crypto').webcrypto
    } catch {
        return null
    }
}

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
            .from('lottery_drawings') as any)
            .update({
                status: 'drawn',
                total_entries: 0,
                total_participants: 0,
                drawn_at: new Date().toISOString()
            })
            .eq('id', drawingId)

        return { winner: null, totalTickets: 0 }
    }

    // 4. Generate cryptographically secure random number
    const crypto = getCrypto()
    if (!crypto) throw new Error('Crypto service not available')
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

    // If prize type is 'nice', award Nice directly.
    if (drawing.prize_type === 'nice' && drawing.prize_value > 0) {
        const nicePrize = Math.floor(drawing.prize_value)
        const { data: account, error: accountError } = await (supabase
            .from('nice_accounts') as any)
            .select('nice_collected_balance, total_nice_earned')
            .eq('user_id', winnerEntry.userId)
            .maybeSingle()

        if (accountError) {
            console.error('Failed to fetch nice account for lottery payout:', accountError)
        } else if (!account) {
            console.error('Missing nice account for lottery payout:', winnerEntry.userId)
        } else {
            const { error: updateNiceError } = await (supabase
                .from('nice_accounts') as any)
                .update({
                    nice_collected_balance: account.nice_collected_balance + nicePrize,
                    total_nice_earned: (account.total_nice_earned || 0) + nicePrize,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', winnerEntry.userId)

            if (updateNiceError) {
                console.error('Failed to award lottery nice:', updateNiceError)
            } else {
                const { error: niceTxError } = await (supabase
                    .from('nice_transactions') as any)
                    .insert({
                        user_id: winnerEntry.userId,
                        transaction_type: 'spin_win',
                        nice_amount: nicePrize,
                        description: `Lottery Win: ${drawing.prize_description}`,
                        metadata: { drawing_id: drawingId }
                    })

                if (niceTxError) {
                    console.error('Failed to log lottery nice transaction:', niceTxError)
                }

                // Add to Points Activity Log (0 points) for visibility in Recent Activity
                await (supabase
                    .from('points_transactions') as any)
                    .insert({
                        user_id: winnerEntry.userId,
                        transaction_type: 'earned_lottery',
                        points: 0,
                        description: `Won ${nicePrize} Nice from Lottery`,
                        reference_id: drawingId
                    })
            }
        }
    } else if (drawing.prize_type === 'points' && drawing.prize_value > 0) {
        // Award regular points
        const { error: pointsError } = await (supabase
            .from('points_transactions') as any)
            .insert({
                user_id: winnerEntry.userId,
                transaction_type: 'earned_lottery',
                points: drawing.prize_value,
                description: `Lottery Win: ${drawing.prize_description}`
            })

        if (pointsError) {
            console.error('Failed to award regular points:', pointsError)
        }
    } else if (drawing.prize_type === 'reward') {
        // Add to Points Activity Log (0 points) for visibility in Recent Activity
        await (supabase
            .from('points_transactions') as any)
            .insert({
                user_id: winnerEntry.userId,
                transaction_type: 'earned_lottery',
                points: 0,
                description: `Won Prize: ${drawing.prize_description}`,
                reference_id: drawingId
            })
    }

    // Insert winner record
    const { error: winnerError } = await (supabase
        .from('lottery_winners') as any)
        .insert({
            drawing_id: drawingId,
            user_id: winnerEntry.userId,
            prize_rank: 1,
            prize_description: drawing.prize_description,
            prize_value: drawing.prize_value,
            voucher_code: voucherCode,
            voucher_expiry_date: voucherExpiry.toISOString()
        })

    if (winnerError) throw new Error(`Failed to insert winner: ${winnerError.message}`)

    // Update drawing record
    const { error: updateError } = await (supabase
        .from('lottery_drawings') as any)
        .update({
            status: 'drawn',
            winning_ticket_number: winningTicket,
            random_seed: randomSeed,
            drawn_at: new Date().toISOString(),
            total_entries: totalTickets,
            total_participants: userEntries.size
        })
        .eq('id', drawingId)

    if (updateError) throw new Error(`Failed to update drawing: ${updateError.message}`)

    // 8. Notify winner
    try {
        await notifyLotteryWinner(winnerEntry.userId, drawing, voucherCode)

        // Mark as notified in database
        await (supabase
            .from('lottery_winners') as any)
            .update({
                notified: true,
                notified_at: new Date().toISOString()
            })
            .eq('drawing_id', drawingId)
            .eq('user_id', winnerEntry.userId)
    } catch (e) {
        console.error('Failed to notify winner:', e)
        // Don't fail the whole drawing if notification fails
    }

    // Calculate stats
    // We can do this async or here. Let's do it here.
    const stats = calculateStats(entries || [], drawingId, totalTickets, userEntries, drawing)

    await (supabase.from('lottery_stats') as any).insert(stats)

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

async function notifyLotteryWinner(userId: string, drawing: any, voucherCode: string) {
    const supabase = createAdminClient()

    // 1. Fetch user details
    const { data: userRaw } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single()

    const user = userRaw as { email: string; full_name: string } | null

    if (!user || !user.email) return

    const title = '🎉 You won the lottery!'
    const body = `Congratulations! You won the ${drawing.prize_description} in our weekly lottery.`

    // 2. Create In-App Notification (for Alerts page)
    try {
        await (supabase
            .from('notifications') as any)
            .insert({
                user_id: userId,
                title: title,
                body: body,
                type: 'system',
                is_read: false
            })
    } catch (e) {
        console.error('Failed to create in-app notification:', e)
    }

    // 3. Send Push
    try {
        await sendPushNotification(userId, title, body, '/lottery')
    } catch (e) {
        console.error('Push notification failed:', e)
    }

    // 4. Send Email
    try {
        await sendEmail({
            to: user.email,
            subject: 'Congratulations! You are our Lottery Winner! 🏆',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h1 style="color: #f59e0b;">You Won! 🎉</h1>
                    <p>Hi ${user.full_name || 'Lucky Winner'},</p>
                    <p>We are excited to inform you that you have won this week's lottery drawing!</p>
                    <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fef3c7;">
                        <h2 style="margin-top: 0; margin-bottom: 0;">Prize: ${drawing.prize_description}</h2>
                    </div>
                    <p>If you won Nice or points, they have been automatically added to your balance.</p>
                    <p>For all other prizes, your reward can be found in the "My Rewards" section of the app.</p>
                    <p>Thank you for being a part of our community!</p>
                    <br/>
                    <p>Best regards,<br/>the nice work team</p>
                </div>
            `
        })
    } catch (e) {
        console.error('Email notification failed:', e)
    }
}
