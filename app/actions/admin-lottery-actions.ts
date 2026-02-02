'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { executeDrawing } from '@/lib/lottery/drawing-logic'
import { LotteryDrawing } from '@/lib/lottery/types'

export async function getAdminLotteryDrawings(): Promise<LotteryDrawing[]> {
    try {
        const supabase = createAdminClient()

        const { data, error } = await (supabase
            .from('lottery_drawings') as any)
            .select('*')
            .order('week_start_date', { ascending: false })

        if (error) {
            console.error('Error fetching drawings:', error)
            return [] // Return empty array on error to prevent page crash
        }
        return data as LotteryDrawing[]
    } catch (e) {
        console.error('Unexpected error fetching drawings:', e)
        return []
    }
}

import { LotteryService } from '@/lib/lottery/service'

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
    prizeType?: 'nice' | 'reward'
    rewardId?: string
    autoEntryConfig?: any
}) {
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
    const supabase = createAdminClient()

    const { data, error } = await (supabase.rpc as any)('cancel_lottery_drawing', {
        p_drawing_id: drawingId
    })

    if (error) throw new Error(error.message)
    if (data && !data.success) throw new Error(data.message)

    revalidatePath('/admin/lottery')
}

export async function executeDrawingAdmin(drawingId: string) {
    try {
        await executeDrawing(drawingId)
        revalidatePath('/admin/lottery')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
