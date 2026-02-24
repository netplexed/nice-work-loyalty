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
    console.log("User:", user)

    // 2. Insert into points_transactions manually
    const { error: insertErr } = await supabase.from('points_transactions').insert({
        user_id: user.id,
        transaction_type: 'earned_bonus',
        points: 10,
        description: 'Test trigger'
    })
    console.log("Insert result:", insertErr || "Success")

    // 3. Re-read profile
    const { data: newProfile } = await supabase.from('profiles').select('id, points_balance').eq('id', user.id).single()
    console.log("Profile after insert:", newProfile)
}

test()
