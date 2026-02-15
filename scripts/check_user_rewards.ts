
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkRewards() {
    const email = 'howard@howardlo.com'
    console.log(`Checking rewards for: ${email}`)

    const { data: user } = await supabase.from('profiles').select('id').eq('email', email).single()
    if (!user) {
        console.log('User not found')
        return
    }

    // Check my_rewards (or wherever redemptions/rewards are tracked)
    // The automation issues a reward by calling processAutomationForUser -> awardAutomationReward
    // Let's check nice_transactions for 'raffle_ticket' or 'adjusted' or something?
    // Actually, processAutomationForUser calls awardAutomationReward which inserts into points_transactions or nice_transactions?

    const { data: transactions } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', user.id)

    console.log('Points Transactions:', JSON.stringify(transactions, null, 2))

    const { data: nice_trans } = await supabase
        .from('nice_transactions')
        .select('*')
        .eq('user_id', user.id)

    console.log('Nice Transactions:', JSON.stringify(nice_trans, null, 2))
    const { data: redemptions } = await supabase
        .from('redemptions')
        .select('*')
        .eq('user_id', user.id)

    console.log('Redemptions:', JSON.stringify(redemptions, null, 2))
}

checkRewards()
