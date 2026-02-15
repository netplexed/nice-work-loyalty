
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function simulateSignup() {
    const email = `test_welcome_${Date.now()}@example.com`
    console.log(`Simulating signup for: ${email}`)

    // 1. Create Auth User (or just profile if we can bypass auth, but profile usually references auth.users)
    // Since we are using service role, we might not be able to create auth users easily without admin API.
    // However, profiles table references auth.users (id).
    // Start with creating an auth user using supabase.auth.admin

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: 'Password123!',
        email_confirm: true
    })

    if (authError) {
        console.error('Error creating auth user:', authError)
        return
    }

    console.log(`Auth user created: ${authUser.user.id}`)

    // 2. Create Profile with marketing_consent = true
    // Note: The system might auto-create profile via trigger.
    // We should check if profile exists, if so update it. If not, insert it.

    // Give trigger a moment
    await new Promise(r => setTimeout(r, 2000))

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.user.id).single()

    if (profile) {
        console.log('Profile auto-created by trigger.')
        // Update consent
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ marketing_consent: true, full_name: 'Test Welcome User' })
            .eq('id', authUser.user.id)

        if (updateError) console.error('Error updating profile:', updateError)
        else console.log('Profile updated with marketing_consent = true')
    } else {
        console.log('Profile not found, inserting manual profile...')
        const { error: insertError } = await supabase.from('profiles').insert({
            id: authUser.user.id,
            email: email,
            phone: `+1555${Math.floor(Math.random() * 10000000)}`, // Random dummy phone
            full_name: 'Test Welcome User No Consent',
            marketing_consent: false
        })

        if (insertError) console.error('Error inserting profile:', insertError)
        else console.log('Profile inserted manually.')
    }
}

simulateSignup()
