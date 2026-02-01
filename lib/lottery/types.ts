export type LotteryDrawingStatus = 'upcoming' | 'active' | 'drawn' | 'awarded';
export type LotteryPrizeTier = 'standard' | 'monthly' | 'quarterly';
export type LotteryEntryType = 'base' | 'purchased' | 'visit' | 'checkin';

export interface LotteryDrawing {
    id: string;
    draw_date: string;
    week_start_date: string;
    prize_tier: LotteryPrizeTier;
    prize_description: string;
    prize_value: number;
    status: LotteryDrawingStatus;

    total_entries: number;
    total_participants: number;

    winning_ticket_number: number | null;
    random_seed: string | null;
    drawn_at: string | null;

    created_at: string;
    updated_at: string;
}

export interface LotteryEntry {
    id: string;
    drawing_id: string;
    user_id: string;
    entry_type: LotteryEntryType;
    nice_spent: number | null;
    quantity: number;
    visit_id: string | null;
    created_at: string;
}

export interface LotteryWinner {
    id: string;
    drawing_id: string;
    user_id: string;
    prize_rank: number;
    prize_description: string;
    prize_value: number;
    voucher_code: string | null;
    voucher_expiry_date: string | null;
    claimed: boolean;
    claimed_at: string | null;
    notified: boolean;
    notified_at: string | null;
    created_at: string;
}

export interface LotteryStats {
    id: string;
    drawing_id: string;
    total_participants: number;
    total_entries: number;
    total_nice_spent: number;
    avg_entries_per_user: number | null;
    entries_purchased: number;
    entries_visit: number;
    entries_checkin: number;
    entries_base: number;
    created_at: string;
}

// Frontend/API Response Types

export interface CurrentLotteryResponse {
    drawing: LotteryDrawing;
    user_entries: {
        total: number;
        breakdown: {
            base: number;
            purchased: number;
            visit: number;
            checkin: number;
        };
    };
    remaining: {
        can_purchase: number; // Max 10 - purchased
        can_visit: number;    // Max 3 - visit bonuses
        can_checkin: boolean; // True if haven't checked in
    };
    odds: {
        numerator: number;
        denominator: number;
        percentage: string;
    };
    time_until_draw: string;
}

export interface PurchaseEntriesResponse {
    success: boolean;
    entries_purchased: number;
    nice_spent: number;
    new_balance: number;
    total_entries: number;
    message: string;
}
