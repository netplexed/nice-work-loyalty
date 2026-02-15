
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAutomations() {
    console.log('Checking active automations...')
    const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('active', true)

    if (error) {
        console.error('Error fetching automations:', error)
        return
    }

    console.log(JSON.stringify(data, null, 2))
}

checkAutomations()
