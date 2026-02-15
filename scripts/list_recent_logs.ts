
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function listRecentLogs() {
    console.log('Listing automation logs from the last 24 hours...')
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    const { data: logs, error } = await supabase
        .from('automation_logs')
        .select(`
            *,
            profiles ( email ),
            automations ( name, type )
        `)
        .gte('executed_at', yesterday.toISOString())
        .order('executed_at', { ascending: false })

    if (error) {
        console.error('Error fetching logs:', error)
        return
    }

    console.log(`Found ${logs.length} logs.`)
    logs.forEach(l => {
        console.log(`- ${l.executed_at} | User: ${l.profiles?.email} | Automation: ${l.automations?.name}`)
    })
}

listRecentLogs()
