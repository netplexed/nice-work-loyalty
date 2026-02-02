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

export async function createLotteryDrawingAdmin({
    prizeDescription,
    prizeValue,
    drawDate
}: {
    prizeDescription: string
    prizeValue: number
    drawDate: string // ISO string
}) {
    const supabase = createAdminClient()

    // Determine start date (now) - acts as the period start
    const startDate = new Date()
    const targetDate = new Date(drawDate)

    const { error } = await (supabase
        .from('lottery_drawings') as any)
        .insert({
            draw_date: targetDate.toISOString(),
            week_start_date: startDate.toISOString(),
            prize_tier: 'standard',
            prize_description: prizeDescription,
            prize_value: prizeValue,
            status: 'active'
        })

    if (error) throw new Error(error.message)
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
