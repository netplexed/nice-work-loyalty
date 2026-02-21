
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

async function runFullManual() {
    console.log('--- Full Manual Automation Test ---')
    const userId = 'f78918ef-eb2a-4ac5-a05c-384cf388ea44'
    const email = 'howard@howardlo.com'
    const automationId = '6df5c6a0-eecb-4363-9f82-1f04d2748f9f'
    const rewardId = '905c11aa-ba34-4419-bb17-c2eb25cfc113'

    // 1. Reset
    console.log('Resetting log and redemption for test...')
    await supabase.from('automation_logs').delete().eq('user_id', userId)
    await supabase.from('redemptions').delete().eq('user_id', userId).eq('reward_id', rewardId)

    // 2. Fetch Automation
    console.log('Fetching automation...')
    const { data: auto } = await supabase.from('automations').select('*').eq('id', automationId).single()
    if (!auto) { console.error('Auto not found'); return; }

    // 3. Simulated processAutomationForUser
    console.log('Step 1: Inserting log...')
    const { error: logError } = await supabase.from('automation_logs').insert({
        automation_id: auto.id,
        user_id: userId
    })
    if (logError) { console.error('Log Error:', logError); return; }

    console.log('Step 2: Issuing reward...')
    if (auto.reward_id) {
        const { data: reward, error: rewardFetchError } = await supabase.from('rewards').select('*').eq('id', auto.reward_id).single()
        if (reward) {
            const { error: redemptionError } = await supabase.from('redemptions').insert({
                user_id: userId,
                reward_id: reward.id,
                points_spent: 0,
                status: 'approved',
                voucher_code: `TEST-AUTO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
            })
            if (redemptionError) {
                console.error('Redemption Error:', redemptionError)
                // In prod, it proceeds anyway. Let's see if it fails here.
            } else {
                console.log('Redemption issued successfully.')
            }
        } else {
            console.error('Reward Fetch Error:', rewardFetchError)
        }
    }

    console.log('Step 3: Sending email...')
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile`
    const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'nice work <hello@nicework.sg>',
        to: email,
        subject: auto.email_subject + ' (Full Manual Test)',
        html: `<h1>Welcome!</h1><p>Full manual test logic.</p><br/><a href="${unsubscribeUrl}">Unsubscribe</a>`
    })

    if (emailError) {
        console.error('Email Error:', emailError)
    } else {
        console.log('Email Sent Successfully:', emailData)
    }
}

runFullManual()
