
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkSpecificLog() {
    const userId = 'f78918ef-eb2a-4ac5-a05c-384cf388ea44' // howard@howardlo.com
    console.log(`Checking logs for user ID: ${userId}`)

    const { data: logs, error } = await supabase
        .from('automation_logs')
        .select(`
            *,
            automations (*)
        `)
        .eq('user_id', userId)

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log(JSON.stringify(logs, null, 2))
}

checkSpecificLog()
