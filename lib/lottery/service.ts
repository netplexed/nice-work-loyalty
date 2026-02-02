import { SupabaseClient } from '@supabase/supabase-js'
import { addDays, setHours, startOfWeek, getWeekOfMonth, getQuarter, subDays } from 'date-fns'
import { LotteryDrawing } from './types'

export class LotteryService {
    constructor(private supabase: SupabaseClient) { }

    /**
     * Get the current active lottery drawing.
     */
    async getCurrentDrawing() {
        // Logic: Active status AND draw_date is in the future (or today)
        // Actually, status 'active' is the main indicator.
        const { data, error } = await this.supabase
            .from('lottery_drawings')
            .select('*')
            .eq('status', 'active')
            .order('draw_date', { ascending: true })
            .limit(1)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 is no rows
            throw error
        }

        return data as LotteryDrawing | null
    }

    /**
     * Get user's entries for a specific drawing.
     */
    async getUserEntries(drawingId: string, userId: string) {
        const { data, error } = await this.supabase
            .from('lottery_entries')
            .select('*')
            .eq('drawing_id', drawingId)
            .eq('user_id', userId)

        if (error) throw error
        return data
    }

    /**
     * Purchase entries for a user.
     */
    async purchaseEntries(userId: string, quantity: number, drawingId: string) {
        // Call the RPC function for atomic transaction
        const { data, error } = await this.supabase
            .rpc('purchase_lottery_entries', {
                p_user_id: userId,
                p_quantity: quantity,
                p_drawing_id: drawingId
            })

        if (error) throw error
        return data
    }

    /**
     * Award visit bonus.
     */
    async awardVisitBonus(userId: string, visitId: string, drawingId: string) {
        const { data, error } = await this.supabase
            .rpc('award_lottery_visit_bonus', {
                p_user_id: userId,
                p_visit_id: visitId,
                p_drawing_id: drawingId
            })

        if (error) throw error
        return data
    }

    /**
     * Award check-in bonus.
     */
    async awardCheckinBonus(userId: string, drawingId: string) {
        const { data, error } = await this.supabase
            .rpc('award_lottery_checkin_bonus', {
                p_user_id: userId,
                p_drawing_id: drawingId
            })

        if (error) throw error
        return data
    }

    /**
     * Scheduled logic: Create New Weekly Drawing
     * Should be run on Monday 12 AM
     */
    async createWeeklyDrawing() {
        const now = new Date()
        // Week starts on Monday (1)
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        // Draw is next Sunday (6 days later)
        const drawDate = addDays(weekStart, 6)
        // Set draw time to 8:00 PM
        drawDate.setHours(20, 0, 0, 0)

        // Check if drawing already exists for this week
        const { data: existing } = await this.supabase
            .from('lottery_drawings')
            .select('id')
            .eq('week_start_date', weekStart.toISOString())
            .maybeSingle()

        if (existing) {
            console.log('Drawing for this week already exists')
            return existing
        }

        // Determine prize tier
        // Simplified logic: 
        // 1st week of quarter -> Quarterly
        // 1st week of month -> Monthly
        // Else -> Standard

        const currentWeekOfMonth = getWeekOfMonth(now, { weekStartsOn: 1 })
        const isFirstWeekOfMonth = currentWeekOfMonth === 1

        // Check if it's start of a quarter (Jan, Apr, Jul, Oct)
        const month = now.getMonth() // 0-11
        const isStartOfQuarter = (month % 3 === 0) && isFirstWeekOfMonth

        let prizeTier = 'standard'
        let prizeDescription = '$50 Dining Voucher'
        let prizeValue = 50

        if (isStartOfQuarter) {
            prizeTier = 'quarterly'
            prizeDescription = '$500 Dining Voucher'
            prizeValue = 500
        } else if (isFirstWeekOfMonth) {
            prizeTier = 'monthly'
            prizeDescription = '$100 Dining Voucher'
            prizeValue = 100
        }

        const { data: newDrawing, error } = await this.supabase
            .from('lottery_drawings')
            .insert({
                week_start_date: weekStart,
                draw_date: drawDate,
                prize_tier: prizeTier,
                prize_description: prizeDescription,
                prize_value: prizeValue,
                status: 'active'
            })
            .select()
            .single()

        if (error) throw error
        return newDrawing
    }

    /**
     * Process auto-entries based on drawing configuration.
     * Can be called manually or via cron.
     */
    async processAutoEntries(drawingId: string) {
        const { data: drawing, error } = await this.supabase
            .from('lottery_drawings')
            .select('*')
            .eq('id', drawingId)
            .single()

        if (error || !drawing) throw new Error('Drawing not found')

        const config = drawing.auto_entry_config || { type: 'all', quantity: 1 }
        const quantity = config.quantity || 1

        // Define eligible user IDs
        let userIds: string[] = []

        if (config.type === 'recent_visit') {
            const days = config.days || 60
            const cutoffDate = new Date()
            cutoffDate.setDate(cutoffDate.getDate() - days)

            // Get unique users who checked in recently
            // Note: Using 'check_ins' table
            const { data: checkins, error: checkinError } = await this.supabase
                .from('check_ins')
                .select('user_id')
                .gte('created_at', cutoffDate.toISOString())

            if (checkinError) {
                console.error('Error fetching checkins:', checkinError)
                return { count: 0 }
            }

            // Unique IDs
            userIds = Array.from(new Set(checkins?.map((c: any) => c.user_id)))

        } else if (config.type === 'push_enabled') {
            // Users with active push subscriptions
            const { data: subs, error: subError } = await this.supabase
                .from('push_subscriptions')
                .select('user_id')

            if (subError) {
                console.error('Error fetching push subscriptions:', subError)
                return { count: 0 }
            }

            userIds = Array.from(new Set(subs?.map((s: any) => s.user_id)))

        } else {
            // Default: All active users (profiles)
            const { data: profiles, error: profileError } = await this.supabase
                .from('profiles')
                .select('id')

            if (profileError) throw profileError
            userIds = profiles?.map(p => p.id) || []
        }

        if (userIds.length === 0) return { count: 0 }

        // Batch insert
        const chunkSize = 1000
        const chunks = []
        for (let i = 0; i < userIds.length; i += chunkSize) {
            chunks.push(userIds.slice(i, i + chunkSize))
        }

        let totalAwarded = 0

        for (const chunk of chunks) {
            const entries = chunk.map(id => ({
                drawing_id: drawingId,
                user_id: id,
                entry_type: 'base',
                quantity: quantity
            }))

            const { error: insertError } = await this.supabase
                .from('lottery_entries')
                .insert(entries)

            if (insertError) {
                console.error('Error batch inserting auto entries:', insertError)
            } else {
                totalAwarded += entries.length
            }
        }

        // Update stats
        if (totalAwarded > 0) {
            // Call the new RPC function to recalculate stats correctly
            const { error: statsError } = await this.supabase.rpc('recalculate_lottery_stats', {
                p_drawing_id: drawingId
            })

            if (statsError) {
                // Fallback for older DB versions if RPC doesn't exist yet
                console.error('Error recalculating stats (RPC likely missing):', statsError)
                const { data: d } = await this.supabase.from('lottery_drawings').select('total_entries').eq('id', drawingId).single()
                await this.supabase.from('lottery_drawings').update({
                    total_entries: (d?.total_entries || 0) + totalAwarded
                }).eq('id', drawingId)
            }
        }

        return { count: totalAwarded }
    }

    /**
     * Scheduled logic: Award Base Entries
     * Run Monday 12:05 AM
     */
    async awardBaseEntries() {
        // 1. Get active drawing
        const drawing = await this.getCurrentDrawing()
        if (!drawing) {
            console.error('No active drawing found for base entries')
            return { count: 0 }
        }

        // 2. Delegate to generic processor
        return this.processAutoEntries(drawing.id)
    }
}
