import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
    const { data: latestUsers } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(3)
    console.log("Latest Users:", latestUsers)

    const { data: latestTransactions } = await supabase
        .from('points_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

    console.log("Latest Transactions:")
    console.log(JSON.stringify(latestTransactions, null, 2))

    const { data: latestSpins } = await supabase
        .from('spins')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

    console.log("Latest Spins:")
    console.log(JSON.stringify(latestSpins, null, 2))
}

main().catch(console.error)
