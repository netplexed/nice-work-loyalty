'use server'

import { createClient } from '@/lib/supabase/server'
import { processAutomations } from '@/lib/automations/process-automations'
import { verifyAdmin } from './admin-actions'

export async function triggerManualAutomation() {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Debug action disabled in production')
    }

    const isAdmin = await verifyAdmin()
    if (!isAdmin) {
        throw new Error('Unauthorized')
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    // Allow any user to trigger THEIR OWN automations?
    // The shared function `processAutomations` takes a specificUserId opt.
    // If we pass user.id, it only runs for them. Safe-ish.

    // BUT we need to make sure `processAutomations` is safe.
    // Yes, it checks logic.

    const result = await processAutomations(user.id)
    return result
}
