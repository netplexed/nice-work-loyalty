'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function simulateCheckIn(location: string = 'Tanuki Raw') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // 1. Record the check-in (We allow multiple per day for testing/demo purposes)
    const { error: checkInError } = await supabase
        .from('check_ins')
        .insert({
            user_id: user.id,
            location: location,
            points_awarded: 0
        })

    if (checkInError) throw checkInError

    revalidatePath('/')
    return { success: true }
}
