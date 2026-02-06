
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send-email'
import { SupabaseClient } from '@supabase/supabase-js'

export async function processAutomations(specificUserId?: string) {
    // USE ADMIN CLIENT to bypass RLS and see all users/logs
    const supabase = createAdminClient()

    // 1. Fetch Active Automations
    const { data: automations } = await supabase
        .from('automations')
        .select('*')
        .eq('active', true) as any

    if (!automations || automations.length === 0) {
        return { success: true, message: 'No active automations', results: [] as any[] }
    }

    const results = []

    for (const auto of automations) {
        let sentCount = 0

        // --- WELCOME AUTOMATION ---
        if (auto.type === 'welcome') {
            const cutoff = new Date()
            cutoff.setDate(cutoff.getDate() - 3)

            let query = supabase
                .from('profiles')
                .select('id, email, full_name, marketing_consent')
                .gte('created_at', cutoff.toISOString())
                .eq('marketing_consent', true)
                .not('email', 'is', null)

            if (specificUserId) {
                query = query.eq('id', specificUserId)
            }

            const { data: newUsers } = await query as any

            if (newUsers) {
                for (const user of newUsers) {
                    // Check log
                    const logQuery = supabase
                        .from('automation_logs')
                        .select('id')
                        .eq('automation_id', auto.id)
                        .eq('user_id', user.id)
                        .single()

                    const { data: log } = await logQuery

                    if (!log) {
                        await processAutomationForUser(supabase, auto, user)
                        sentCount++
                    }
                }
            }
        }

        // --- BIRTHDAY AUTOMATION ---
        else if (auto.type === 'birthday') {
            const today = new Date()
            const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0')

            let query = supabase
                .from('profiles')
                .select('id, email, full_name, birthday, marketing_consent')
                .not('birthday', 'is', null)
                .eq('marketing_consent', true)
                .not('email', 'is', null)

            if (specificUserId) {
                query = query.eq('id', specificUserId)
            }

            const { data: users } = await query as any

            if (users) {
                const birthdayUsers = users.filter((u: any) => {
                    if (!u.birthday) return false
                    const d = new Date(u.birthday)
                    const m = (d.getMonth() + 1).toString().padStart(2, '0')
                    return m === currentMonth
                })

                for (const user of birthdayUsers) {
                    const yearStart = new Date(today.getFullYear(), 0, 1).toISOString()

                    const { data: log } = await supabase
                        .from('automation_logs')
                        .select('id')
                        .eq('automation_id', auto.id)
                        .eq('user_id', user.id)
                        .gte('executed_at', yearStart)
                        .single()

                    if (!log) {
                        await processAutomationForUser(supabase, auto, user)
                        sentCount++
                    }
                }
            }
        }

        // --- WIN-BACK (INACTIVITY) ---
        else if (auto.type === 'win_back') {
            const days = auto.trigger_settings?.days_inactive || 30
            const cutoff = new Date()
            cutoff.setDate(cutoff.getDate() - days)

            const { data: activeUserIds } = await supabase
                .from('check_ins')
                .select('user_id')
                .gte('created_at', cutoff.toISOString()) as any

            const activeSet = new Set(activeUserIds?.map((c: any) => c.user_id))

            let query = supabase
                .from('profiles')
                .select('id, email, full_name, marketing_consent')
                .eq('marketing_consent', true)
                .not('email', 'is', null)

            if (specificUserId) {
                query = query.eq('id', specificUserId)
            }

            const { data: potentialLostUsers } = await query as any

            if (potentialLostUsers) {
                for (const user of potentialLostUsers) {
                    if (!activeSet.has(user.id)) {
                        const cooldown = new Date()
                        cooldown.setDate(cooldown.getDate() - 90)

                        const { data: log } = await supabase
                            .from('automation_logs')
                            .select('id')
                            .eq('automation_id', auto.id)
                            .eq('user_id', user.id)
                            .gte('executed_at', cooldown.toISOString())
                            .single()

                        if (!log) {
                            await processAutomationForUser(supabase, auto, user)
                            sentCount++
                        }
                    }
                }
            }
        }

        results.push({ name: auto.name, sent: sentCount })
    }

    return { success: true, results }
}


async function processAutomationForUser(supabase: SupabaseClient, auto: any, user: any) {
    // 1. Log Execution immediately (Concurrency safety - simple)
    const { error } = await supabase.from('automation_logs').insert({
        automation_id: auto.id,
        user_id: user.id
    })

    if (error) {
        console.error('Failed to log automation, skipping', error)
        return // Skip to avoid double send if race condition
    }

    // 2. Grant Reward (if any)
    if (auto.reward_id) {
        // Fetch reward details
        const { data: reward } = await supabase.from('rewards').select('*').eq('id', auto.reward_id).single()
        if (reward) {
            // Issue Voucher
            await supabase.from('redemptions').insert({
                user_id: user.id,
                reward_id: reward.id,
                points_spent: 0, // Free
                status: 'approved', // Auto-approved
                voucher_code: `AUTO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
            })
        }
    }

    // 3. Send Email
    try {
        const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/profile`
        // Replace variables
        let body = auto.email_body || ''
        // Check if user.full_name is present
        body = body.replace('{{name}}', user.full_name || 'Friend')

        await sendEmail({
            to: user.email,
            subject: auto.email_subject,
            html: `
                ${body}
                <br/><hr/>
                <p style="text-align: center; font-size: 12px; color: #888;">
                    <a href="${unsubscribeUrl}">Unsubscribe</a>
                </p>
            `
        })
    } catch (e) {
        console.error(`Failed to send automation email to ${user.email}`, e)
    }
}
