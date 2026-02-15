
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

async function fixMarketingConsent() {
    console.log('Applying marketing consent fix to recent users...')

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7) // Last 7 days

    // Update users who have consent = false
    const { data, error } = await supabase
        .from('profiles')
        .update({ marketing_consent: true })
        .gte('created_at', cutoff.toISOString())
        .eq('marketing_consent', false)
        .select()

    if (error) {
        console.error('Error updating users:', error)
        return
    }

    console.log(`Successfully updated ${data.length} users to have marketing_consent = true.`)
    data.forEach(u => console.log(` - Updated: ${u.email} (${u.id})`))
}

fixMarketingConsent()
