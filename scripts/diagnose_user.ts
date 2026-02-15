
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function diagnoseUser() {
    const email = 'howard@howardlo.com'
    console.log(`Diagnosing user: ${email}`)

    // 1. Fetch Profile(s)
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)

    if (error) {
        console.error('Error fetching profiles:', error)
        return
    }

    console.log(`Found ${profiles.length} profile(s).`)

    for (const p of profiles) {
        console.log('--------------------------------------------------')
        console.log(`ID: ${p.id}`)
        console.log(`Created At: ${p.created_at}`)
        console.log(`Marketing Consent: ${p.marketing_consent}`)
        // Check logs
        const { data: logs } = await supabase
            .from('automation_logs')
            .select('*')
            .eq('user_id', p.id)

        console.log(`Automation Logs: ${logs?.length || 0}`)
        if (logs) {
            logs.forEach(l => console.log(` - Log date: ${l.executed_at} (ID: ${l.id})`))
        }

        // Check if there are logs for this EMAIL but different ID (manual check if possible, but automation_logs doesn't have email)
    }

    // 2. Check Auth Users (Admin only)
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers()
    if (authUsers) {
        const targetAuth = authUsers.find(u => u.email === email)
        if (targetAuth) {
            console.log('--------------------------------------------------')
            console.log(`Auth User Found: ${targetAuth.id}`)
            console.log(`Auth Created At: ${targetAuth.created_at}`)
            console.log(`Auth Last Sign In: ${targetAuth.last_sign_in_at}`)
        } else {
            console.log('--------------------------------------------------')
            console.log('Auth User NOT FOUND in list (checked first 50)')
        }
    }
}

diagnoseUser()
