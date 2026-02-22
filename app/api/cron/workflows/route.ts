import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send-email'

// ... (comments)

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')

    // Use Admin Client to bypass RLS for background processing
    const supabase = createAdminClient()

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

    // Cast to any because workflow_enrollments table is missing from generated types
    for (const enrollment of (enrollments as any[])) {
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

                        await (supabase.from('workflow_enrollments') as any).update({
                            current_step_index: nextIndex,
                            next_execution_at: triggerTime.toISOString()
                        }).eq('id', enrollment.id)
                    } else {
                        // Regular step, ready to run ASAP (or next tick)
                        await (supabase.from('workflow_enrollments') as any).update({
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
    await (supabase.from('workflow_enrollments') as any).update({
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
        subject: subjectOverride || template.subject || 'Notification from nice work',
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
