
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send-email'
import { SupabaseClient } from '@supabase/supabase-js'

export async function processAutomations(specificUserId?: string) {
    console.log(`[Automation] processAutomations called for ${specificUserId || 'ALL'}`)
    // USE ADMIN CLIENT to bypass RLS and see all users/logs
    const supabase = createAdminClient()
    const logs: string[] = []

    const addLog = (msg: string) => {
        console.log(`[Automation] ${msg}`)
        logs.push(msg)
    }

    addLog(`processAutomations called for ${specificUserId || 'ALL'}`)

    // 1. Fetch Active Automations
    const { data: automations, error: fetchAutoError } = await supabase
        .from('automations')
        .select('*')
        .eq('active', true) as any

    if (fetchAutoError) {
        addLog(`ERROR: Failed to fetch automations: ${fetchAutoError.message}`)
        return { success: false, error: fetchAutoError.message, logs }
    }

    if (!automations || automations.length === 0) {
        addLog('No active automations found.')
        return { success: true, message: 'No active automations', results: [] as any[], logs }
    }

    addLog(`Found ${automations.length} active automations: ${automations.map((a: any) => a.type).join(', ')}`)

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
                addLog(`Filtering query for specific user: ${specificUserId}`)
            }

            const { data: newUsers, error: queryError } = await query as any

            if (queryError) {
                addLog(`Database error fetching candidates: ${queryError.message}`)
                continue
            }

            addLog(`Found ${newUsers?.length || 0} candidates created since ${cutoff.toLocaleDateString()}`)

            if (newUsers) {
                for (const user of newUsers) {
                    addLog(`Checking user: ${user.email} (ID: ${user.id})`)
                    // Check log
                    const { data: log, error: logCheckError } = await supabase
                        .from('automation_logs')
                        .select('id, executed_at')
                        .eq('automation_id', auto.id)
                        .eq('user_id', user.id)
                        .maybeSingle() as any

                    if (logCheckError) {
                        addLog(`Error checking logs for ${user.email}: ${logCheckError.message}`)
                        continue
                    }

                    // FORCE RETRY if specificUserId is passed (helps debugging)
                    const isForced = specificUserId && specificUserId === user.id

                    if (!log || isForced) {
                        if (isForced && log) {
                            addLog(`FORCING retry for ${user.id} (${user.email}) despite existing log.`)
                        } else {
                            addLog(`No prior log for ${user.email}. Starting process...`)
                        }

                        const result = await processAutomationForUser(supabase, auto, user, addLog)
                        if (result.success) {
                            sentCount++
                            addLog(`✅ Successfully completed ${auto.name} for ${user.email}`)
                        } else {
                            addLog(`❌ Execution failed for ${user.email}: ${result.error}`)
                        }
                    } else {
                        addLog(`User ${user.email} already processed at ${log.executed_at}. Skipping.`)
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
                addLog(`Filtering query for specific user: ${specificUserId}`)
            }

            const { data: users, error: queryError } = await query as any

            if (queryError) {
                addLog(`Database error fetching candidates: ${queryError.message}`)
                continue
            }

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

                    const { data: logRaw, error: logCheckError } = await supabase
                        .from('automation_logs')
                        .select('id, executed_at')
                        .eq('automation_id', auto.id)
                        .eq('user_id', user.id)
                        .gte('executed_at', yearStart)
                        .maybeSingle()

                    if (logCheckError) {
                        addLog(`Error checking logs for ${user.email}: ${logCheckError.message}`)
                        continue
                    }

                    const log = logRaw as any

                    // FORCE RETRY if specificUserId is passed (helps debugging)
                    const isForced = specificUserId && specificUserId === user.id

                    if (!log || isForced) {
                        if (isForced && log) {
                            addLog(`FORCING retry for ${user.id} (${user.email}) despite existing log.`)
                        } else {
                            addLog(`Sending Birthday to ${user.email}`)
                        }
                        const result = await processAutomationForUser(supabase, auto, user, addLog)
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

            const { data: activeUserIds, error: activeUsersError } = await supabase
                .from('check_ins')
                .select('user_id')
                .gte('created_at', cutoff.toISOString()) as any

            if (activeUsersError) {
                addLog(`Database error fetching active users: ${activeUsersError.message}`)
                continue
            }

            const activeSet = new Set(activeUserIds?.map((c: any) => c.user_id))

            let query = supabase
                .from('profiles')
                .select('id, email, full_name, marketing_consent')
                .eq('marketing_consent', true)
                .gt('total_visits', 0) // Only win back users who have visited at least once
                .not('email', 'is', null)

            if (specificUserId) {
                query = query.eq('id', specificUserId)
                addLog(`Filtering query for specific user: ${specificUserId}`)
            }

            const { data: potentialLostUsers, error: potentialLostUsersError } = await query as any

            if (potentialLostUsersError) {
                addLog(`Database error fetching potential lost users: ${potentialLostUsersError.message}`)
                continue
            }

            addLog(`Found ${potentialLostUsers?.length || 0} potential win-back users (visited > 0)`)

            if (potentialLostUsers) {
                for (const user of potentialLostUsers) {
                    if (!activeSet.has(user.id)) {
                        const cooldown = new Date()
                        cooldown.setDate(cooldown.getDate() - 90)

                        const { data: logRaw, error: logCheckError } = await supabase
                            .from('automation_logs')
                            .select('id, executed_at')
                            .eq('automation_id', auto.id)
                            .eq('user_id', user.id)
                            .gte('executed_at', cooldown.toISOString())
                            .maybeSingle()

                        if (logCheckError) {
                            addLog(`Error checking logs for ${user.email}: ${logCheckError.message}`)
                            continue
                        }

                        const log = logRaw as any

                        // FORCE RETRY if specificUserId is passed (helps debugging)
                        const isForced = specificUserId && specificUserId === user.id

                        if (!log || isForced) {
                            if (isForced && log) {
                                addLog(`FORCING retry for ${user.id} (${user.email}) despite existing log.`)
                            } else {
                                addLog(`Sending Win-Back to ${user.email}`)
                            }
                            const result = await processAutomationForUser(supabase, auto, user, addLog)
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


async function processAutomationForUser(supabase: SupabaseClient, auto: any, user: any, addLog: (msg: string) => void) {
    addLog(`[Execution] Starting for ${user.email}...`)

    // 1. Log Execution immediately
    // IF force retrying, we might need to ignore unique constraint or delete first
    await supabase.from('automation_logs').delete().eq('automation_id', auto.id).eq('user_id', user.id)

    const { error: logError } = await supabase.from('automation_logs').insert({
        automation_id: auto.id,
        user_id: user.id
    })

    if (logError) {
        addLog(`[Execution] Database log failed: ${logError.message}`)
        return { success: false, error: 'Database log failed: ' + logError.message }
    }

    addLog(`[Execution] Log created. Moving to reward issuance...`)

    // 2. Grant Reward (if any)
    if (auto.reward_id) {
        addLog(`[Execution] Fetching reward details: ${auto.reward_id}`)
        const { data: reward, error: rewardFetchError } = await supabase.from('rewards').select('*').eq('id', auto.reward_id).single()

        if (rewardFetchError) {
            addLog(`[Execution] Reward fetch failed: ${rewardFetchError.message}`)
            await supabase.from('automation_logs').delete().eq('automation_id', auto.id).eq('user_id', user.id)
            return { success: false, error: `Reward fetch failed: ${rewardFetchError.message}` }
        }

        if (reward) {
            addLog(`[Execution] Issuing reward "${reward.name}"...`)
            const { error: redemptionError } = await supabase.from('redemptions').insert({
                user_id: user.id,
                reward_id: reward.id,
                points_spent: 0,
                status: 'approved',
                voucher_code: `AUTO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
            })

            if (redemptionError) {
                addLog(`[Execution] Redemption insert failed: ${redemptionError.message}`)
                await supabase.from('automation_logs').delete().eq('automation_id', auto.id).eq('user_id', user.id)
                return { success: false, error: `Redemption failed: ${redemptionError.message}` }
            }
            addLog(`[Execution] Reward issued successfully.`)
        } else {
            addLog(`[Execution] Skip reward: ID ${auto.reward_id} not found.`)
        }
    }

    // 3. Send Email
    try {
        addLog(`[Execution] Preparing email...`)
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
            addLog(`[Execution] Email SEND failed: ${emailResult.error}`)

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

        addLog(`[Execution] ✅ Final success for ${user.email}`)
        return { success: true }
    } catch (e: any) {
        addLog(`[Execution] CRASH: ${e.message}`)
        await supabase.from('automation_logs').delete().eq('automation_id', auto.id).eq('user_id', user.id)
        return { success: false, error: e.message }
    }
}
