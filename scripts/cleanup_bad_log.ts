
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function cleanupLogs() {
    const email = 'howard@howardlo.com'
    console.log(`Cleaning up logs for: ${email}`)

    const { data: user } = await supabase.from('profiles').select('id').eq('email', email).single()

    if (!user) {
        console.log('User not found')
        return
    }

    const { error } = await supabase
        .from('automation_logs')
        .delete()
        .eq('user_id', user.id)

    if (error) {
        console.error('Error deleting logs:', error)
    } else {
        console.log('Successfully deleted logs. The automation should retry this user now.')
    }
}

cleanupLogs()
