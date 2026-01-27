'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getEmailTemplates() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('updated_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data
}

export async function getEmailTemplate(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw new Error(error.message)
    return data
}

export async function createEmailTemplate(formData: FormData) {
    const supabase = await createClient()

    // Verify Admin
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const subject = formData.get('subject') as string
    const content_html = formData.get('content_html') as string
    const design_json_str = formData.get('design_json') as string
    const design_json = design_json_str ? JSON.parse(design_json_str) : {}

    const { error } = await supabase.from('email_templates').insert({
        name,
        description,
        subject,
        content_html,
        design_json,
        created_by: session.user.id
    })

    if (error) throw new Error(error.message)

    revalidatePath('/admin/marketing/templates')
    redirect('/admin/marketing/templates')
}

export async function updateEmailTemplate(id: string, formData: FormData) {
    const supabase = await createClient()

    // Verify Admin
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const subject = formData.get('subject') as string
    const content_html = formData.get('content_html') as string
    const design_json_str = formData.get('design_json') as string
    // Only parse if provided
    const updates: any = {
        name,
        description,
        subject,
        content_html,
        updated_at: new Date().toISOString()
    }

    if (design_json_str) {
        updates.design_json = JSON.parse(design_json_str)
    }

    const { error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/admin/marketing/templates')
    redirect('/admin/marketing/templates')
}

export async function deleteEmailTemplate(id: string) {
    const supabase = await createClient()

    // Verify Admin
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/admin/marketing/templates')
}
