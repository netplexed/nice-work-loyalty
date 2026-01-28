'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function grantReward(userId: string, rewardId: string, notes?: string) {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase.rpc('admin_grant_reward', {
            p_user_id: userId,
            p_reward_id: rewardId,
            p_notes: notes
        })

        if (error) throw error

        revalidatePath('/admin/users')
        revalidatePath(`/admin/users/${userId}`)

        return { success: true, data }
    } catch (error: any) {
        console.error('Grant reward error:', error)
        return { success: false, error: error.message }
    }
}
