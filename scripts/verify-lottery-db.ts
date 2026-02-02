import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables for local script execution
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars. Make sure .env.local exists.')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verify() {
    console.log('Verifying lottery_drawings table...')
    const { data, error } = await supabase
        .from('lottery_drawings')
        .select('*')
        .limit(5)

    if (error) {
        console.error('❌ Error accessing lottery_drawings:', error.message)
        return
    }

    console.log(`✅ Success! Found ${data.length} drawings.`)
    console.log('Data:', JSON.stringify(data, null, 2))
}

verify()
