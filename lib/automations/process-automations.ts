
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send-email'
import { SupabaseClient } from '@supabase/supabase-js'

export async function processAutomations(specificUserId?: string) {
    // USE ADMIN CLIENT to bypass RLS and see all users/logs
    const supabase = createAdminClient()
    const logs: string[] = []

    const addLog = (msg: string) => logs.push(msg)

    // 1. Fetch Active Automations
    const { data: automations } = await supabase
        .from('automations')
        .select('*')
        .eq('active', true) as any

    if (!automations || automations.length === 0) {
        addLog('No active automations found. Please enable them in Admin -> Automations or by migration.')
        return { success: true, message: 'No active automations', results: [] as any[], logs }
    }

    addLog(`Found ${automations.length} active automations`)

    const results = []

    for (const auto of automations) {
        let sentCount = 0
        addLog(`Processing automation: ${auto.name} (${auto.type})`)

        // --- WELCOME AUTOMATION ---
        if (auto.type === 'welcome') {
            const cutoff = new Date()
            cutoff.setDate(cutoff.getDate() - 3)

            let query = supabase
                .from('profiles')
                .select('id, email, full_name, marketing_consent, created_at')
                .gte('created_at', cutoff.toISOString())
                .not('email', 'is', null)

            if (specificUserId) {
                query = query.eq('id', specificUserId)
                console.log(`[Automation] Filtering for specific user: ${specificUserId}`)
            }

            const { data: newUsers, error: queryError } = await query as any

            if (queryError) {
                console.error(`[Automation] Database error fetching candidates:`, queryError)
                continue
            }

            console.log(`[Automation] Found ${newUsers?.length || 0} candidates for Welcome automation`)

            if (newUsers) {
                for (const user of newUsers) {
                    console.log(`[Automation] Checking eligibility for: ${user.email} (ID: ${user.id})`)
                    // Check log
                    const { data: log, error: logCheckError } = await supabase
                        .from('automation_logs')
                        .select('id, executed_at')
                        .eq('automation_id', auto.id)
                        .eq('user_id', user.id)
                        .maybeSingle() as any

                    if (logCheckError) {
                        console.error(`[Automation] Error checking logs for ${user.email}:`, logCheckError)
                        continue
                    }

                    if (!log) {
                        console.log(`[Automation] No prior log for ${user.email}. Starting process...`)
                        const result = await processAutomationForUser(supabase, auto, user)
                        if (result.success) {
                            sentCount++
                            console.log(`[Automation] ✅ Successfully completed ${auto.name} for ${user.email}`)
                        } else {
                            console.error(`[Automation] ❌ Execution failed for ${user.email}: ${result.error}`)
                        }
                    } else {
                        console.log(`[Automation] User ${user.email} already processed at ${log.executed_at}. Skipping.`)
                    }
                }
            }
        }

        // --- BIRTHDAY AUTOMATION ---
        else if (auto.type === 'birthday') {
            const today = new Date()
            const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0')
            addLog(`Checking Birthdays for month: ${currentMonth}`)

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

                addLog(`Found ${birthdayUsers.length} users with birthdays this month`)

                for (const user of birthdayUsers) {
                    const yearStart = new Date(today.getFullYear(), 0, 1).toISOString()

                    const { data: logRaw } = await supabase
                        .from('automation_logs')
                        .select('id, executed_at')
                        .eq('automation_id', auto.id)
                        .eq('user_id', user.id)
                        .gte('executed_at', yearStart)
                        .single()

                    const log = logRaw as any

                    if (!log) {
                        addLog(`Sending Birthday to ${user.email}`)
                        const result = await processAutomationForUser(supabase, auto, user)
                        if (result.success) {
                            sentCount++
                            addLog(`✅ Sent Birthday to ${user.email}`)
                        } else {
                            addLog(`❌ Failed to send to ${user.email}: ${result.error}`)
                        }
                    } else {
                        addLog(`Skipping ${user.email}: Already received this year (${new Date(log.executed_at).toLocaleDateString()})`)
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
                .gt('total_visits', 0) // Only win back users who have visited at least once
                .not('email', 'is', null)

            if (specificUserId) {
                query = query.eq('id', specificUserId)
            }

            const { data: potentialLostUsers } = await query as any

            addLog(`Found ${potentialLostUsers?.length || 0} potential win-back users (visited > 0)`)

            if (potentialLostUsers) {
                for (const user of potentialLostUsers) {
                    if (!activeSet.has(user.id)) {
                        const cooldown = new Date()
                        cooldown.setDate(cooldown.getDate() - 90)

                        const { data: logRaw } = await supabase
                            .from('automation_logs')
                            .select('id, executed_at')
                            .eq('automation_id', auto.id)
                            .eq('user_id', user.id)
                            .gte('executed_at', cooldown.toISOString())
                            .single()

                        const log = logRaw as any

                        if (!log) {
                            addLog(`Sending Win-Back to ${user.email}`)
                            const result = await processAutomationForUser(supabase, auto, user)
                            if (result.success) {
                                sentCount++
                                addLog(`✅ Sent Win-Back to ${user.email}`)
                            } else {
                                addLog(`❌ Failed to send to ${user.email}: ${result.error}`)
                            }
                        } else {
                            addLog(`Skipping ${user.email}: In cool-down (Last sent: ${new Date(log.executed_at).toLocaleDateString()})`)
                        }
                    }
                }
            }
        }

        results.push({ name: auto.name, sent: sentCount })
    }

    return { success: true, results, logs }
}


async function processAutomationForUser(supabase: SupabaseClient, auto: any, user: any) {
    console.log(`[Automation] [Execution] Starting for ${user.email}...`)

    // 1. Log Execution immediately
    const { error: logError } = await supabase.from('automation_logs').insert({
        automation_id: auto.id,
        user_id: user.id
    })

    if (logError) {
        console.error(`[Automation] [Execution] Database log failed for ${user.email}:`, logError)
        return { success: false, error: 'Database log failed: ' + logError.message }
    }

    console.log(`[Automation] [Execution] Log created. Moving to reward issuance...`)

    // 2. Grant Reward (if any)
    if (auto.reward_id) {
        console.log(`[Automation] [Execution] Fetching reward details: ${auto.reward_id}`)
        const { data: reward, error: rewardFetchError } = await supabase.from('rewards').select('*').eq('id', auto.reward_id).single()

        if (rewardFetchError) {
            console.error(`[Automation] [Execution] Reward fetch failed:`, rewardFetchError)
            await supabase.from('automation_logs').delete().eq('automation_id', auto.id).eq('user_id', user.id)
            return { success: false, error: `Reward fetch failed: ${rewardFetchError.message}` }
        }

        if (reward) {
            console.log(`[Automation] [Execution] Issuing reward "${reward.name}"...`)
            const { error: redemptionError } = await supabase.from('redemptions').insert({
                user_id: user.id,
                reward_id: reward.id,
                points_spent: 0,
                status: 'approved',
                voucher_code: `AUTO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
            })

            if (redemptionError) {
                console.error(`[Automation] [Execution] Redemption insert failed:`, redemptionError)
                await supabase.from('automation_logs').delete().eq('automation_id', auto.id).eq('user_id', user.id)
                return { success: false, error: `Redemption failed: ${redemptionError.message}` }
            }
            console.log(`[Automation] [Execution] Reward issued successfully.`)
        } else {
            console.warn(`[Automation] [Execution] Skip reward: ID ${auto.reward_id} not found.`)
        }
    }

    // 3. Send Email
    try {
        console.log(`[Automation] [Execution] Preparing email...`)
        const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://makenice.nicework.sg'}/profile`
        let body = auto.email_body || ''
        body = body.replace('{{name}}', user.full_name || 'Friend')

        const emailResult = await sendEmail({
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

        if (!emailResult.success) {
            console.error(`[Automation] [Execution] Email SEND failed: ${emailResult.error}`)

            // Delete log so we can try again
            await supabase.from('automation_logs').delete().eq('automation_id', auto.id).eq('user_id', user.id)

            // Alert admin
            await sendEmail({
                to: 'hello@nicework.sg',
                subject: `ALERT: Automation Failed for ${user.email}`,
                html: `<p>Automation <b>${auto.name}</b> failed to send email to ${user.email}.</p><p>Error: ${emailResult.error}</p>`
            }).catch(() => { })

            return { success: false, error: emailResult.error }
        }

        console.log(`[Automation] [Execution] ✅ Final success for ${user.email}`)
        return { success: true }
    } catch (e: any) {
        console.error(`[Automation] [Execution] CRASH for ${user.email}:`, e)
        await supabase.from('automation_logs').delete().eq('automation_id', auto.id).eq('user_id', user.id)
        return { success: false, error: e.message }
    }
}
