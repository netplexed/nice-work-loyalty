'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { executeDrawing } from '@/lib/lottery/drawing-logic'

export async function getAdminLotteryDrawings() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('lottery_drawings')
        .select('*')
        .order('week_start_date', { ascending: false })

    if (error) throw new Error(error.message)
    return data
}

export async function createWeeklyDrawingAdmin() {
    const supabase = await createClient()

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

    const { error } = await supabase
        .from('lottery_drawings')
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
