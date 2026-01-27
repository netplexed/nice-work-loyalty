'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getMarketingWorkflows() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('marketing_workflows')
        .select(`
            *,
            enrollments:workflow_enrollments(count)
        `)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data
}

export async function getMarketingWorkflow(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('marketing_workflows')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw new Error(error.message)
    return data
}

export async function createMarketingWorkflow(formData: FormData) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const trigger_type = formData.get('trigger_type') as string
    const trigger_config = JSON.parse(formData.get('trigger_config') as string || '{}')
    const steps = JSON.parse(formData.get('steps') as string || '[]')
    const active = formData.get('active') === 'true'

    const { error } = await supabase.from('marketing_workflows').insert({
        name,
        description,
        trigger_type,
        trigger_config,
        steps,
        active,
        created_by: session.user.id
    })

    if (error) throw new Error(error.message)

    revalidatePath('/admin/marketing/workflows')
    redirect('/admin/marketing/workflows')
}

export async function updateMarketingWorkflow(id: string, formData: FormData) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/login')

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const trigger_type = formData.get('trigger_type') as string
    const trigger_config = JSON.parse(formData.get('trigger_config') as string || '{}')
    const steps = JSON.parse(formData.get('steps') as string || '[]')
    const active = formData.get('active') === 'true'

    const { error } = await supabase
        .from('marketing_workflows')
        .update({
            name,
            description,
            trigger_type,
            trigger_config,
            steps,
            active,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)

    if (error) throw new Error(error.message)

    revalidatePath('/admin/marketing/workflows')
    redirect('/admin/marketing/workflows')
}

export async function deleteMarketingWorkflow(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('marketing_workflows').delete().eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/admin/marketing/workflows')
}

export async function toggleWorkflowStatus(id: string, active: boolean) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('marketing_workflows')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('id', id)

    if (error) throw new Error(error.message)
    revalidatePath('/admin/marketing/workflows')
}
