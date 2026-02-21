
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function clearLogsForHoward() {
    const emails = ['howard@howardlo.com']

    for (const email of emails) {
        console.log(`Clearing logs for: ${email}`)
        const { data: users } = await supabase.from('profiles').select('id').eq('email', email)

        if (users && users.length > 0) {
            for (const user of users) {
                console.log(`Deleting logs and redemptions for user ID: ${user.id}`)
                await supabase.from('automation_logs').delete().eq('user_id', user.id)
                await supabase.from('redemptions').delete().eq('user_id', user.id)
            }
        }
    }
    console.log('Cleanup complete.')
}

clearLogsForHoward()
