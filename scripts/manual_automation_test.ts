
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

async function runManual() {
    console.log('Running manual automation test (Inline Logic)...')
    const userId = 'd759efd9-40c6-4c98-80c5-531a48ac2949'
    const email = 'howard@howardlo.com'

    // 1. Delete logs
    console.log(`Deleting existing logs for user: ${userId}`)
    await supabase.from('automation_logs').delete().eq('user_id', userId)

    // 2. Fetch User to confirm eligibility logic
    console.log('Fetching user...')
    const { data: user, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error || !user) {
        console.error('User not found:', error)
        return
    }
    console.log('User found:', user.email, 'Consent:', user.marketing_consent)

    // 3. Send Email
    console.log('Sending email via Resend...')
    try {
        const { data, error: emailError } = await resend.emails.send({
            from: 'Nice Work Loyalty <admin@nicework.sg>',
            to: email,
            subject: 'Welcome to Nice Work (Manual Test)',
            html: '<h1>Welcome!</h1><p>This is a manual test from local script.</p>'
        })

        if (emailError) {
            console.error('Email Failed:', emailError)
        } else {
            console.log('Email Sent Successfully:', data)
        }
    } catch (e) {
        console.error('Example error:', e)
    }
}

runManual()
