'use server'

import { createClient } from '@/lib/supabase/server'

interface EventProperties {
    [key: string]: any
}

/**
 * Tracks a user event and triggers any matching marketing workflows.
 * Usage: await trackEvent(userId, 'order.completed', { value: 100 })
 */
export async function trackEvent(userId: string, eventName: string, properties: EventProperties = {}) {
    const supabase = await createClient()

    console.log(`[Marketing] Tracking event: ${eventName} for user: ${userId}`, properties)

    try {
        // 1. Find active workflows triggered by this event
        // Note: Supabase JSON filtering limitations often mean we fetch a bit more and filter in JS if complex.
        // Simple case: trigger_config ->> 'event' equals eventName
        const { data: workflows } = await supabase
            .from('marketing_workflows')
            .select('*')
            .eq('active', true)
            .eq('trigger_type', 'event')
            // This assumes trigger_config is { "event": "name", ... }
            .eq('trigger_config->>event', eventName)

        if (!workflows || workflows.length === 0) {
            return { success: true, triggered: 0 }
        }

        let triggeredCount = 0

        // 2. Evaluate constraints and Enroll
        for (const wf of workflows) {
            // TODO check filters (e.g. min_value > 50)
            // For now, assuming basic event match is enough or filters loosely checked.

            // Check if already enrolled? 
            // Re-entry settings would go here. For now, allow multiple unique enrollments (concurrent?) or one active?
            // Let's prevent *duplicate active* enrollments for the same workflow to keep it sane.
            const { data: existing } = await supabase
                .from('workflow_enrollments')
                .select('id')
                .eq('workflow_id', wf.id)
                .eq('user_id', userId)
                .eq('status', 'active')
                .single()

            if (existing) {
                console.log(`[Marketing] User ${userId} already active in workflow ${wf.name}`)
                continue
            }

            // Create Enrollment
            const { data: enrollment, error } = await supabase
                .from('workflow_enrollments')
                .insert({
                    workflow_id: wf.id,
                    user_id: userId,
                    current_step_index: 0,
                    status: 'active',
                    context: { event: eventName, ...properties },
                    next_execution_at: new Date().toISOString() // Ready to run
                })
                .select()
                .single()

            if (error) {
                console.error(`[Marketing] Failed to enroll user ${userId} in ${wf.name}`, error)
                continue
            }

            triggeredCount++

            // Optimization: We could execute Step 0 immediately here instead of waiting for Cron.
            // But Cron is safer/simpler for Step 1.
            // Let's leave it to Cron for robustness unless immediate feedback is needed.
        }

        return { success: true, triggered: triggeredCount }
    } catch (err) {
        console.error('[Marketing] trackEvent error:', err)
        // Don't fail the parent transaction (e.g. checkout) just because marketing failed
        return { success: false, error: err }
    }
}
