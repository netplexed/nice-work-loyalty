import { config } from 'dotenv'
config({ path: '.env.local' })
import { createAdminClient } from '../lib/supabase/admin'

async function checkUserBalances() {
    const supabase = createAdminClient()
    const email = 'howard@howardlo.com' // Using the author email from git commits to guess

    let { data: authUsers, error: err0 } = await supabase.auth.admin.listUsers()

    if (err0) {
        console.error(err0)
        return
    }

    // Just get the most recently created user
    const recentUser = authUsers.users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (!recentUser) {
        console.log("No users found");
        return;
    }

    console.log("Found recent user:", recentUser.email, recentUser.id, "created at", recentUser.created_at)

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', recentUser.id).single()
    console.log("Profile:", profile)

    const { data: niceAccount } = await supabase.from('nice_accounts').select('*').eq('id', recentUser.id).single()
    if (!niceAccount) {
        const { data: niceAccountUserId } = await supabase.from('nice_accounts').select('*').eq('user_id', recentUser.id).single()
        console.log("Nice Account by user_id:", niceAccountUserId)
    } else {
        console.log("Nice Account by id:", niceAccount)
    }
}

checkUserBalances()
