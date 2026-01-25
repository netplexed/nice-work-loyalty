'use server'

import { createClient } from '@/lib/supabase/server'
import { verifyAdmin } from './admin-actions'
import { sendEmail } from '@/lib/email/send-email'
import { revalidatePath } from 'next/cache'

export async function createCampaign(data: {
    title: string
    subject: string
    html_content: string
    json_content?: any
    target_audience?: string
}) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data: user } = await supabase.auth.getUser()

    const { data: campaign, error } = await supabase
        .from('email_campaigns')
        .insert({
            ...data,
            target_audience: data.target_audience || 'all',
            created_by: user?.user?.id,
            status: 'draft'
        })
        .select()
        .single()

    if (error) throw new Error(error.message)
    revalidatePath('/admin/emails')
    return campaign
}

export async function sendCampaign(campaignId: string) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    // 1. Fetch Campaign
    const { data: campaign, error: fetchError } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

    if (fetchError || !campaign) throw new Error('Campaign not found')
    if (campaign.status === 'sent' || campaign.status === 'sending') throw new Error('Campaign already sent')

    // 2. Update Status to Sending
    await supabase.from('email_campaigns').update({ status: 'sending' }).eq('id', campaignId)

    // 3. Fetch Recipients
    // Logic: Fetch all users with marketing_consent = true (and valid email)
    // If target_audience = 'vip', filter by tier (bonus >= 1.2)

    let recipients: string[] = []

    if (campaign.target_audience === 'vip') {
        const { data: accounts } = await supabase
            .from('nice_accounts')
            .select('user_id')
            .gte('tier_bonus', 1.2)

        const accountUserIds = accounts?.map(a => a.user_id) || []

        if (accountUserIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('email')
                .in('id', accountUserIds)
                .eq('marketing_consent', true)
                .not('email', 'is', null)

            recipients = profiles?.map(p => p.email).filter(Boolean) as string[] || []
        }
    } else {
        // 'all' or default
        const { data: profiles } = await supabase
            .from('profiles')
            .select('email')
            .eq('marketing_consent', true)
            .not('email', 'is', null)

        recipients = profiles?.map(p => p.email).filter(Boolean) as string[] || []
    }

    if (recipients.length === 0) {
        await supabase.from('email_campaigns').update({ status: 'sent', sent_count: 0 }).eq('id', campaignId)
        return { success: true, count: 0 }
    }

    // 4. Send Emails via Resend
    // We wrap the content in a template with Unsubscribe link
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/profile`
    const items = recipients.map(email => ({
        to: email,
        subject: campaign.subject,
        html: `
            ${campaign.html_content}
            <br/>
            <hr/>
            <p style="text-align: center; font-size: 12px; color: #888;">
                You received this email from Nice Work Loyalty. 
                <a href="${unsubscribeUrl}">Unsubscribe</a>
            </p>
        `
    }))

    // Send loop (batching ideally)
    let sentCount = 0
    // Limit concurrency
    const batchSize = 10
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)
        await Promise.allSettled(batch.map(item => sendEmail(item)))
        sentCount += batch.length
    }

    // 5. Update Status to Sent
    await supabase.from('email_campaigns').update({
        status: 'sent',
        sent_count: sentCount,
        recipient_count: recipients.length,
        sent_at: new Date().toISOString()
    }).eq('id', campaignId)

    revalidatePath('/admin/emails')
    return { success: true, count: sentCount }
}

export async function getCampaigns() {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false })

    return data || []
}

export async function getCampaign(id: string) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', id)
        .single()

    return data
}

export async function updateCampaign(id: string, data: any) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { error } = await supabase
        .from('email_campaigns')
        .update(data)
        .eq('id', id)

    if (error) throw error
    revalidatePath('/admin/emails')
}

export async function deleteCampaign(id: string) {
    const isAdmin = await verifyAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    await supabase.from('email_campaigns').delete().eq('id', id)
    revalidatePath('/admin/emails')
}
