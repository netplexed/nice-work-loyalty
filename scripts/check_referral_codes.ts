
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function listReferrals() {
    console.log('Listing all referral codes...')

    const { data, error } = await supabase
        .from('referrals')
        .select('referral_code, referrer_id, status')

    if (error) {
        console.error('❌ Error fetching referrals:', error.message)
        return
    }

    console.log(`✅ Found ${data.length} codes:`)
    data.forEach(r => {
        console.log(`- [${r.status}] ${r.referral_code} (User: ${r.referrer_id})`)
    })
}

listReferrals()
