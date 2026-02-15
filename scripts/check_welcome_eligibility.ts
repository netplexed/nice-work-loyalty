
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

async function checkRecentUsers() {
    console.log('Checking recent users for welcome email eligibility...')

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 5) // Check last 5 days

    const { data: users, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, marketing_consent, created_at')
        .gte('created_at', cutoff.toISOString())
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching users:', error)
        return
    }

    console.log(`Found ${users.length} users created in the last 5 days.`)

    for (const user of users) {
        console.log(`User: ${user.email}, Created: ${new Date(user.created_at).toLocaleString()}, Consent: ${user.marketing_consent}`)

        // Check if they would be picked up by automation
        if (user.marketing_consent) {
            console.log('  -> ELIGIBLE for Welcome Email')
            // Check logs
            const { data: logs } = await supabase
                .from('automation_logs')
                .select('*')
                .eq('user_id', user.id)

            if (logs && logs.length > 0) {
                console.log(`  -> ALREADY SENT (Logs found: ${logs.length})`)
            } else {
                console.log('  -> PENDING (Not sent yet)')
            }
        } else {
            console.log('  -> NOT ELIGIBLE (No Marketing Consent)')
        }
    }
}

checkRecentUsers()
