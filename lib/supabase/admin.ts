import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/database.types'

// Note: This client typically runs in a Node.js context (Server Actions / API Routes)
// It bypasses RLS, so use with extreme caution.

export const createAdminClient = () => {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}
