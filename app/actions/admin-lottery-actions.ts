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

export async function createWeeklyDrawingAdmin() {
    const supabase = createAdminClient()

    // Calculate next Sunday 8PM
    const now = new Date()
    const drawDate = new Date(now)
    drawDate.setDate(now.getDate() + (7 - now.getDay()) % 7) // Next Sunday (or today)
    drawDate.setHours(20, 0, 0, 0)

    // If today is Sunday and it's past 8PM, move to next week
    if (now.getDay() === 0 && now.getHours() >= 20) {
        drawDate.setDate(drawDate.getDate() + 7)
    }

    // Week start is draw date - 7 days
    const weekStart = new Date(drawDate)
    weekStart.setDate(weekStart.getDate() - 7)

    const { error } = await (supabase
        .from('lottery_drawings') as any)
        .insert({
            draw_date: drawDate.toISOString(),
            week_start_date: weekStart.toISOString(),
            prize_tier: 'standard',
            prize_description: 'Weekly 1000 Nice Prize',
            prize_value: 1000,
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
