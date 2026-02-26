import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSubscriptions() {
    console.log('--- Checking Push Subscriptions ---')

    const { data: subs, error } = await supabase
        .from('push_subscriptions')
        .select(`
            id,
            user_id,
            endpoint,
            keys,
            updated_at,
            profiles:user_id (full_name, email)
        `)
        .order('updated_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('Error fetching subscriptions:', error)
        return
    }

    if (!subs || subs.length === 0) {
        console.log('No subscriptions found.')
        return
    }

    subs.forEach((sub: any) => {
        const isNative = !sub.keys
        const platform = isNative ? (sub.endpoint.length > 20 ? 'FCM/Native' : 'Native?') : 'Web'
        console.log(`[${sub.updated_at}] User: ${sub.profiles?.full_name || 'Unknown'} (${sub.profiles?.email || 'N/A'})`)
        console.log(`  Platform: ${platform}`)
        console.log(`  Endpoint: ${sub.endpoint.substring(0, 30)}...`)
        console.log('---')
    })

    const nativeCount = subs.filter((s: any) => !s.keys).length
    console.log(`Total checked: ${subs.length}, Native (FCM): ${nativeCount}`)
}

checkSubscriptions()
