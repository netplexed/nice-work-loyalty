import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send-email'

// Helper to check if a run happened effectively today (or within reasonable duplicate window)
// Actually, logs ensure we don't send twice.
// Welcome: Send once per user.
// Birthday: Send once per year.
// Win-back: Send once per inactivity period? Or just once then cooldown?
// Implementation:
// Welcome: Check if log exists for user+automation.
// Birthday: Check if log exists for user+automation with executed_at in current year.
// Win-back: Check if log exists for user+automation since last visit? Or just cooldown of 90 days.

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')

    // Simple protection: Check for CRON_SECRET or Admin Session
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    // Check Admin
    let isAdmin = false
    if (session) {
        const { data } = await supabase.from('admin_users').select('id').eq('id', session.user.id).eq('active', true).single()
        if (data) isAdmin = true
    }

    if (key !== process.env.CRON_SECRET && !isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch Active Automations
    const { data: automations } = await supabase
        .from('automations')
        .select('*')
        .eq('active', true)

    if (!automations || automations.length === 0) {
        return NextResponse.json({ message: 'No active automations' })
    }

    const results = []

    for (const auto of automations) {
        let sentCount = 0

        // --- WELCOME AUTOMATION ---
        if (auto.type === 'welcome') {
            // Find users created in last 24-48 hours who haven't received it
            // Actually, created anytime, as long as no log exists.

            // Optimization: Filter by created_at > 7 days ago to avoid blasting old users if we just turned it on?
            // Usually Welcome is for NEW users. Let's say last 3 days.
            const cutoff = new Date()
            cutoff.setDate(cutoff.getDate() - 3)

            const { data: newUsers } = await supabase
                .from('profiles')
                .select('id, email, full_name, marketing_consent')
                .gte('created_at', cutoff.toISOString())
                .eq('marketing_consent', true) // Respect consent? Transactional welcome usually ignores, but this is "Marketing".
                // Let's assume Welcome is transactionalish but we respect consent for "rewards". 
                // Actually, implicit consent for welcome is standard. 
                // But let's stick to explicit for safety.
                .not('email', 'is', null)

            if (newUsers) {
                for (const user of newUsers) {
                    // Check log
                    const { data: log } = await supabase
                        .from('automation_logs')
                        .select('id')
                        .eq('automation_id', auto.id)
                        .eq('user_id', user.id)
                        .single()

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
            const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0') // '01'
            // We can run this daily. Users with birthday in this month get it ONCE.
            // Ideally on the 1st day, or whenever script runs.

            // Filter profiles with birthday month = currentMonth
            // Supabase filter limitations: Need text search or JS.
            // Assuming we fetch all users with set birthdays?
            const { data: users } = await supabase
                .from('profiles')
                .select('id, email, full_name, birthday, marketing_consent')
                .not('birthday', 'is', null)
                .eq('marketing_consent', true)
                .not('email', 'is', null)

            if (users) {
                const birthdayUsers = users.filter(u => {
                    if (!u.birthday) return false
                    const d = new Date(u.birthday)
                    const m = (d.getMonth() + 1).toString().padStart(2, '0')
                    return m === currentMonth
                })

                for (const user of birthdayUsers) {
                    // Check log for THIS YEAR
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

            // Find users who have NOT visited since cutoff
            // Logic: Last Check-In < cutoff
            // We need 'max(created_at)' from check_ins per user.
            // Or just 'last_interaction' if we had it on profiles.

            // Heavy query approach:
            // Get all recent checkins. Exclude those users.
            // Then from remaining users, pick those whose LAST checkin was before cutoff.

            // Better: We iterate candidates (e.g. VIPs or all)? 
            // Let's stick to checking `profiles` who are active.
            // If `check_ins` table is huge, this is slow.
            // Assume we can get distinct user_ids from check_ins > cutoff.

            const { data: activeUserIds } = await supabase
                .from('check_ins')
                .select('user_id')
                .gte('created_at', cutoff.toISOString())

            const activeSet = new Set(activeUserIds?.map(c => c.user_id))

            const { data: potentialLostUsers } = await supabase
                .from('profiles')
                .select('id, email, full_name, marketing_consent')
                .eq('marketing_consent', true)
                .not('email', 'is', null)

            if (potentialLostUsers) {
                for (const user of potentialLostUsers) {
                    if (!activeSet.has(user.id)) {
                        // User hasn't visited recently.
                        // Check if we already sent win-back recently (e.g. within 90 days)
                        // Don't spam them every day after day 30.
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

    return NextResponse.json({ success: true, results })
}


async function processAutomationForUser(supabase: any, auto: any, user: any) {
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
