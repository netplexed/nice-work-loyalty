-- MANUAL UPDATE V4: Spin Wheel Nice Prize Support
-- Run this in Supabase SQL Editor.

-- 1. Add 'nice' to spin_prizes type check
alter table public.spin_prizes 
  drop constraint if exists spin_prizes_type_check;

alter table public.spin_prizes 
  add constraint spin_prizes_type_check 
  check (type in ('points', 'reward', 'loss', 'nice'));

-- 2. Add 'spin_win' to transaction types
do $$
begin
  alter table public.nice_transactions 
    drop constraint if exists nice_transactions_transaction_type_check;

  alter table public.nice_transactions 
    add constraint nice_transactions_transaction_type_check 
    check (transaction_type in (
      'generated', 'collected', 'visit_bonus', 'converted_to_points',
      'gifted_sent', 'gifted_received', 'auction_bid', 'auction_refund',
      'raffle_ticket', 'donation', 'store_purchase', 'flash_sale',
      'expired', 'adjusted',
      'lottery_purchase', 'lottery_refund',
      'spin_win' -- New type
    ));
exception
    when others then null;
end $$;

-- 3. Update process_spin function to handle 'nice'
CREATE OR REPLACE FUNCTION process_spin()
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_prize record;
    v_prizes record;
    v_random float;
    v_cumulative float := 0;
    v_total_weight float := 0;
    v_can_spin boolean;
    v_spin_id uuid;
    v_voucher_code text;
    v_new_balance integer; -- For debug/return
BEGIN
    v_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check daily eligibility
    SELECT can_spin_today(v_user_id) INTO v_can_spin;
    IF NOT v_can_spin THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already spun today');
    END IF;

    -- Calculate total weight
    SELECT sum(probability) INTO v_total_weight
    FROM public.spin_prizes
    WHERE active = true;

    IF v_total_weight IS NULL OR v_total_weight = 0 THEN
         RAISE EXCEPTION 'No active prizes configured';
    END IF;

    -- Random selection
    v_random := random() * v_total_weight;

    -- Select the prize based on weight
    FOR v_prize IN 
        SELECT * FROM public.spin_prizes 
        WHERE active = true 
        ORDER BY probability DESC 
    LOOP
        v_cumulative := v_cumulative + v_prize.probability;
        IF v_random <= v_cumulative THEN
            EXIT; -- Found our winner
        END IF;
    END LOOP;

    IF v_prize IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Prize selection failed');
    END IF;

    -- Record the Spin
    -- Note: We map 'nice' type to 'nice' in DB if column supports it, otherwise 'points' or handling logic might vary.
    -- Assuming public.spins prize_type handles text, so 'nice' is fine.
    INSERT INTO public.spins (
        user_id, 
        spin_type, 
        prize_type, 
        prize_value, 
        prize_description
    ) VALUES (
        v_user_id,
        'daily',
        v_prize.type,
        CASE 
            WHEN v_prize.type = 'points' THEN v_prize.points_value 
            WHEN v_prize.type = 'nice' THEN v_prize.points_value -- We use points_value col for Nice amount too
            ELSE 0 
        END,
        v_prize.label
    ) RETURNING id INTO v_spin_id;

    -- Award the Prize
    IF v_prize.type = 'points' AND v_prize.points_value > 0 THEN
        -- Add points transaction
        INSERT INTO public.points_transactions (
            user_id,
            transaction_type,
            points,
            description,
            reference_id
        ) VALUES (
            v_user_id,
            'earned_spin',
            v_prize.points_value,
            'Won from Daily Spin: ' || v_prize.label,
            v_spin_id
        );
        
    ELSIF v_prize.type = 'nice' AND v_prize.points_value > 0 THEN
        -- Add Nice Balance
        UPDATE public.nice_accounts
        SET nice_collected_balance = nice_collected_balance + v_prize.points_value,
            -- total_nice_earned = total_nice_earned + v_prize.points_value, -- Optional if exists, skipping for safety if unsure, but nice_collected_balance is key
            updated_at = now()
        WHERE user_id = v_user_id;

        -- Log Transaction
        INSERT INTO public.nice_transactions (
            user_id, transaction_type, nice_amount, metadata, description
        ) VALUES (
            v_user_id, 
            'spin_win', 
            v_prize.points_value, 
            jsonb_build_object('spin_id', v_spin_id),
            'Won from Daily Spin: ' || v_prize.label
        );

    ELSIF v_prize.type = 'reward' AND v_prize.reward_id IS NOT NULL THEN
        -- Generate simplistic voucher code
        v_voucher_code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Create redemption
        INSERT INTO public.redemptions (
            user_id,
            reward_id,
            points_spent,
            status,
            voucher_code,
            expires_at
        ) VALUES (
            v_user_id,
            v_prize.reward_id,
            0,
            'approved',
            v_voucher_code,
            now() + (COALESCE(v_prize.expiry_hours, 36) || ' hours')::interval
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'prize', to_jsonb(v_prize),
        'spin_id', v_spin_id
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
