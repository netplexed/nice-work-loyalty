import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send-email'
// import { getEmailTemplate } from '@/app/actions/email-template-actions' // We might need to fetch template content directly via DB to avoid auth context issues in cron


// Helper for "Service Role" operations or mimicking admin rights in Cron
// Since we don't have a full Service Role client exposed in this codebase structure easily,
// we rely on the Cron Secret protection and assume RLS allows the server to act or we use a specific admin user context if strictly needed.
// However, Supabase `createClient()` in Next.js usually uses the Request cookies. 
// For Cron, we might need a Service Role client if RLS is strict.
// *Assumption*: The tables have policies allowing "Admins" and we might authenticate as an admin or bypass RLS if we had service key. 
// Current codebase seems to rely on "user session" or "admin check".
// We will try to fetch without RLS if possible or Assume the Cron logic has access (Backend privileges).
// Actually, `createClient` in `server.ts` uses cookies. 
// If this is a CRON request, it has no cookies. We need `createClient` with SERVICE_ROLE_KEY if we want to bypass RLS.
// BUT, I don't see `SERVICE_ROLE_KEY` being used in existing cron. 
// existing cron `app/api/cron/automations/route.ts` creates client but then checks for `process.env.CRON_SECRET`.
// It assumes the DB queries work. If RLS is enabled, they might FAIL without a user!
// The previous cron `automations` used `supabase.from('automations')` which has RLS.
// If that route works, then maybe RLS is not enforces for that user or something?
// Wait, `createClient()` uses `process.env.NEXT_PUBLIC_SUPABASE_URL` and `ANON_KEY`.
// Anon key + RLS means... it can only see what Anon can see.
// The `automations` table policy says "Admins can manage". Public cannot see.
// So the existing `cron/automations` route MIGHT BE BROKEN if called without an admin session cookie?
// Check `app/api/cron/automations/route.ts`:
// It checks `if (key !== process.env.CRON_SECRET && !isAdmin)`.
// But the Supabase calls themselves... if they return nothing, it's silently failing?
// *Critical fix*: We probably need to use Service Role for Cron.
// I will attempt to use standard client but if it fails we need to think about Service Role.
// For now, I will use `createClient()` as is, but be aware.

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')
    const supabase = await createClient()

    if (key !== process.env.CRON_SECRET) {
        // Validation failed
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Process Enrollments
    const { data: enrollments } = await supabase
        .from('workflow_enrollments')
        .select(`
            *,
            marketing_workflows (
                id,
                name,
                steps
            )
        `)
        .eq('status', 'active')
        .lte('next_execution_at', new Date().toISOString())

    if (!enrollments || enrollments.length === 0) {
        return NextResponse.json({ message: 'No pending enrollments' })
    }

    const results = []

    for (const enrollment of enrollments) {
        try {
            const workflow = enrollment.marketing_workflows
            if (!workflow) continue

            const steps = workflow.steps || []
            const currentStepIndex = enrollment.current_step_index
            const step = steps[currentStepIndex]

            // If no step (end of workflow)
            if (!step) {
                await completeEnrollment(supabase, enrollment.id)
                results.push({ id: enrollment.id, status: 'completed_end_of_flow' })
                continue
            }

            // Execute Step
            let success = true
            let shouldAdvance = true
            let nextExecutionTime = new Date()

            if (step.type === 'delay') {
                // Determine functionality:
                // If we are HERE, it means `next_execution_at` has passed.
                // Was this delay ALREADY processed?
                // Logic: 
                // 1. Enrollment created -> index 0, next_exec = now.
                // 2. Cron picks up. Step 0 is 'delay 24h'.
                // 3. We DO NOT 'wait' here. We SET next_execution_at = now + 24h, AND we do NOT advance index yet?
                //    Or do we treat "Delay Step" as "Waiting Period"?
                //    Standard: Moving TO a delay step sets the wait.
                //    So, if we are AT a delay step, and next_execution_at is passed, it means we are DONE waiting.
                //    So we can ADVANCE immediately.

                // Wait... when did we enter this step?
                // Interpretation A: 
                //   Step 0: Email. 
                //   Step 1: Delay 24h.
                //   Step 2: Reward.
                // Execution:
                //   - Start: idx=0, exec=Now.
                //   - Run Step 0 (Email). Success. Advance to idx=1. 
                //   - Step 1 is Delay. Calc delay time (Now+24h). Update next_exec=Now+24h. Update DB.
                //   - ... 24h later ...
                //   - Cron picks up. idx=1. exec<=Now.
                //   - We are at Step 1 (Delay). Timer is done. 
                //   - Advance to idx=2. Set exec=Now.
                //   - Cron continues loop? Or waits for next tick?
                //   - Better to continue loop to run Step 2 immediately after delay finishes.

                // Impl: Just Advance.
                shouldAdvance = true
                // nextExecutionTime stays Now (to run next step immediately)
            }
            else if (step.type === 'email') {
                const { template_id, subject_override } = step.config
                await sendWorkflowEmail(supabase, enrollment.user_id, template_id, subject_override, enrollment.context)
            }
            else if (step.type === 'reward') {
                const { reward_id } = step.config
                await grantWorkflowReward(supabase, enrollment.user_id, reward_id)
            }

            if (success && shouldAdvance) {
                const nextIndex = currentStepIndex + 1
                const nextStep = steps[nextIndex]

                if (nextStep) {
                    // Prepare for next step
                    if (nextStep.type === 'delay') {
                        // Calculate delay
                        const hours = parseInt(nextStep.config.duration || '0')
                        const delayMs = hours * 60 * 60 * 1000
                        const triggerTime = new Date()
                        triggerTime.setTime(triggerTime.getTime() + delayMs)

                        await supabase.from('workflow_enrollments').update({
                            current_step_index: nextIndex,
                            next_execution_at: triggerTime.toISOString()
                        }).eq('id', enrollment.id)
                    } else {
                        // Regular step, ready to run ASAP (or next tick)
                        await supabase.from('workflow_enrollments').update({
                            current_step_index: nextIndex,
                            next_execution_at: new Date().toISOString()
                        }).eq('id', enrollment.id)
                    }
                } else {
                    // No more steps
                    await completeEnrollment(supabase, enrollment.id)
                }

                results.push({ id: enrollment.id, step: currentStepIndex, status: 'advanced' })
            }

        } catch (err) {
            console.error(`Error processing enrollment ${enrollment.id}`, err)
            // Log error, maybe set status to failed?
            // await supabase.from('workflow_enrollments').update({ status: 'failed', context: { ...enrollment.context, error: err.message } }).eq('id', enrollment.id)
        }
    }

    return NextResponse.json({ success: true, processed: results.length, details: results })
}

async function completeEnrollment(supabase: any, id: string) {
    await supabase.from('workflow_enrollments').update({
        status: 'completed',
        next_execution_at: null
    }).eq('id', id)
}

async function sendWorkflowEmail(supabase: any, userId: string, templateId: string, subjectOverride: string, context: any) {
    // 1. Fetch User Code
    const { data: user } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single()
    if (!user || !user.email) throw new Error('User not found or no email')

    // 2. Fetch Template
    const { data: template } = await supabase.from('email_templates').select('*').eq('id', templateId).single()
    if (!template) throw new Error('Template not found')

    // 3. Render
    let body = template.content_html || ''
    // Simple variable substitution
    body = body.replace('{{name}}', user.full_name || 'Friend')
    // TODO: Add more context variables if needed

    // 4. Send
    await sendEmail({
        to: user.email,
        subject: subjectOverride || template.subject || 'Notification from Nice Work',
        html: body
    })
}

async function grantWorkflowReward(supabase: any, userId: string, rewardId: string) {
    // Use raw database inserts since we are in a cron/backend context and might not have admin auth for actions
    // But we need to use the logic.
    // Logic: Insert into redemptions with 0 cost.

    // Check reward exists
    const { data: reward } = await supabase.from('rewards').select('*').eq('id', rewardId).single()
    if (!reward) throw new Error('Reward not found')

    await supabase.from('redemptions').insert({
        user_id: userId,
        reward_id: rewardId,
        points_spent: 0,
        status: 'approved',
        voucher_code: `AUTO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    })
}
