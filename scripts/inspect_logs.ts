
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function inspectLogs() {
    // The user from the previous run
    const email = 'test_welcome_1771125732418@example.com'

    const { data: user } = await supabase.from('profiles').select('id').eq('email', email).single()

    if (!user) {
        console.log('User not found')
        return
    }

    console.log(`Checking logs for user ${user.id} (${email})`)

    const { data: logs } = await supabase
        .from('automation_logs')
        .select(`
            *,
            automations ( name, type )
        `)
        .eq('user_id', user.id)

    console.log(JSON.stringify(logs, null, 2))
}

inspectLogs()
