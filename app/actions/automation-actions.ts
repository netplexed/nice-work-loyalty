'use server'

import { createClient } from '@/lib/supabase/server'
import { verifyAdmin } from './admin-actions'
import { revalidatePath } from 'next/cache'

export async function getAutomations() {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data } = await supabase
        .from('automations')
        .select(`
            *,
            rewards (name)
        `)
        .order('created_at', { ascending: true })

    return data || []
}

export async function getAutomation(id: string) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data } = await supabase
        .from('automations')
        .select('*')
        .eq('id', id)
        .single()
    return data
}

export async function updateAutomation(id: string, data: any) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { error } = await supabase
        .from('automations')
        .update({
            ...data,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) throw new Error(error.message)
    revalidatePath('/admin/automations')
}

export async function toggleAutomation(id: string, active: boolean) {
    return updateAutomation(id, { active })
}
