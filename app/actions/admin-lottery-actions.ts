'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { executeDrawing } from '@/lib/lottery/drawing-logic'
import { LotteryService } from '@/lib/lottery/service'
import { verifyAdmin } from './admin-actions'

async function assertAdminAccess() {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')
}

export async function getAdminLotteryDrawings(): Promise<any[]> {
    await assertAdminAccess()

    try {
        const supabase = createAdminClient()

        const { data, error } = await (supabase
            .from('lottery_drawings') as any)
            .select(`
                *,
                lottery_winners (
                    user_id,
                    profiles (
                        full_name,
                        email,
                        phone
                    )
                )
            `)
            .order('week_start_date', { ascending: false })

        if (error) {
            console.error('Error fetching drawings:', error)
            return []
        }
        return data as any[]
    } catch (e) {
        console.error('Unexpected error fetching drawings:', e)
        return []
    }
}

export async function createLotteryDrawingAdmin({
    prizeDescription,
    prizeValue,
    drawDate,
    prizeType = 'nice',
    rewardId,
    autoEntryConfig
}: {
    prizeDescription: string
    prizeValue: number
    drawDate: string
    prizeType?: 'nice' | 'reward' | 'points'
    rewardId?: string
    autoEntryConfig?: any
}) {
    await assertAdminAccess()

    const supabase = createAdminClient()

    // Determine start date (now) - acts as the period start
    const startDate = new Date()
    const targetDate = new Date(drawDate)

    const payload: any = {
        draw_date: targetDate.toISOString(),
        week_start_date: startDate.toISOString(),
        prize_tier: 'standard',
        prize_description: prizeDescription,
        prize_value: prizeValue,
        status: 'active',
        prize_type: prizeType,
        auto_entry_config: autoEntryConfig
    }

    if (rewardId && prizeType === 'reward') {
        payload.reward_id = rewardId
    }

    const { data: drawing, error } = await (supabase
        .from('lottery_drawings') as any)
        .insert(payload)
        .select()
        .single()

    if (error) throw new Error(error.message)

    // Process auto-entries if configured
    if (autoEntryConfig && drawing) {
        try {
            const service = new LotteryService(supabase)
            await service.processAutoEntries(drawing.id)
        } catch (e) {
            console.error('Failed to process auto entries:', e)
            // Don't fail the whole request, just log it.
        }
    }

    revalidatePath('/admin/lottery')
}

export async function cancelLotteryDrawingAdmin(drawingId: string) {
    await assertAdminAccess()

    const supabase = createAdminClient()

    const { data, error } = await (supabase.rpc as any)('cancel_lottery_drawing', {
        p_drawing_id: drawingId
    })

    if (error) throw new Error(error.message)
    if (data && !data.success) throw new Error(data.message)

    revalidatePath('/admin/lottery')
}

export async function executeDrawingAdmin(drawingId: string) {
    await assertAdminAccess()

    try {
        await executeDrawing(drawingId)
        revalidatePath('/admin/lottery')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function recalculateDrawingStats(drawingId: string) {
    await assertAdminAccess()

    const supabase = createAdminClient()
    try {
        const { error } = await (supabase.rpc as any)('recalculate_lottery_stats', {
            p_drawing_id: drawingId
        })

        if (error) throw new Error(error.message)
        revalidatePath('/admin/lottery')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
