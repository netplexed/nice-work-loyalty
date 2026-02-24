import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    console.log("Checking user profile")
    // 1. Get a test user
    const { data: profiles } = await supabase.from('profiles').select('id, points_balance').limit(1)
    if (!profiles?.length) return console.log("No profiles")
    const user = profiles[0]
    console.log("User before:", user)

    // Give nice
    await supabase.from('nice_accounts').update({ nice_collected_balance: 10 }).eq('user_id', user.id)

    const { data: rpcData, error: rpcErr } = await supabase.rpc('convert_nice_to_points', {
        p_user_id: user.id,
        p_nice_amount: 4
    })
    console.log("RPC result:", rpcErr || rpcData)

    // 3. Re-read profile
    const { data: newProfile } = await supabase.from('profiles').select('id, points_balance').eq('id', user.id).single()
    console.log("Profile after RPC:", newProfile)
}

test()
