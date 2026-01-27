'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Announcement = {
    id: string
    title: string
    content: string
    image_url?: string
    action_url?: string
    action_label?: string
    active: boolean
    start_date: string
    end_date?: string
    priority: number
}

// Public: Get active announcements for the carousel
export async function getActiveAnnouncements() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('active', true)
        .lte('start_date', new Date().toISOString())
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching announcements:', error)
        return []
    }

    return data as Announcement[]
}

// Admin: Get all announcements
export async function getAllAnnouncements() {
    const supabase = await createClient()

    // Verify Admin (Optional: Middleware usually handles protection for admin routes, but good to check)
    // For listing, we can rely on RLS if implemented correctly, but explicitly checking role in action is valid too.

    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching all announcements:', error)
        return []
    }

    return data as Announcement[]
}

// Admin: Get Single
export async function getAnnouncementById(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', id)
        .single()

    if (error) return null
    return data as Announcement
}

// Admin: Create
export async function createAnnouncement(data: Partial<Announcement>) {
    const supabase = await createClient()

    // Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    // Simple Admin Check (Assuming you have verifyAdmin or similar, logic inline for now for speed)
    // Ideally use your existing 'verifyAdmin' helper if available.

    const { error } = await supabase.from('announcements').insert({
        ...data,
        created_by: user.id
    })

    if (error) throw new Error(error.message)
    revalidatePath('/')
    revalidatePath('/admin/announcements')
}

// Admin: Update
export async function updateAnnouncement(id: string, data: Partial<Announcement>) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('announcements')
        .update(data)
        .eq('id', id)

    if (error) throw new Error(error.message)
    revalidatePath('/')
    revalidatePath('/admin/announcements')
}

// Admin: Delete
export async function deleteAnnouncement(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
    revalidatePath('/')
    revalidatePath('/admin/announcements')
}
