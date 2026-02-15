
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

async function verifySchema() {
    console.log('Verifying referral_redemptions table...')

    // Try to select from the table
    const { data, error } = await supabase
        .from('referral_redemptions')
        .select('*')
        .limit(1)

    if (error) {
        console.error('❌ Error assessing table:', error.message)
        if (error.code === '42P01') {
            console.error('   Table does not exist!')
        }
    } else {
        console.log('✅ Table referral_redemptions exists.')

        // Check for referrer_rewarded column by trying to select it specifically
        const { data: colData, error: colError } = await supabase
            .from('referral_redemptions')
            .select('referrer_rewarded')
            .limit(1)

        if (colError) {
            console.error('❌ Column referrer_rewarded check failed:', colError.message)
        } else {
            console.log('✅ Column referrer_rewarded exists.')
        }

        // Check recent redemptions
        const { count, error: countError } = await supabase
            .from('referral_redemptions')
            .select('*', { count: 'exact', head: true })

        if (countError) console.error('❌ Error counting redemptions:', countError.message)
        else console.log(`ℹ️ Total referral redemptions: ${count}`)
    }

    // Check notifications table as well since we use it
    const { error: notifError } = await supabase.from('notifications').select('id').limit(1)
    if (notifError) console.error('❌ notifications table error:', notifError.message)
    else console.log('✅ notifications table exists.')

}

verifySchema()
