-- Migration: Harden Spin Logging
-- Description: Ensure ALL spin outcomes (Nice, Reward) are logged to points_transactions so they appear in Recent Activity.
-- This ensures the fix is applied even if previous migrations were partially overwritten.

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
            WHEN v_prize.type = 'nice' THEN v_prize.points_value 
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
            updated_at = now()
        WHERE user_id = v_user_id;

        -- Log Nice Transaction
        INSERT INTO public.nice_transactions (
            user_id, transaction_type, nice_amount, metadata, description
        ) VALUES (
            v_user_id, 
            'spin_win', 
            v_prize.points_value, 
            jsonb_build_object('spin_id', v_spin_id),
            'Won from Daily Spin: ' || v_prize.label
        );

        -- FIX: Add to Points Activity Log (0 points) for visibility
        INSERT INTO public.points_transactions (
            user_id,
            transaction_type,
            points,
            description,
            reference_id
        ) VALUES (
            v_user_id,
            'earned_spin',
            0,
            'Won ' || v_prize.points_value || ' Nice from Spin',
            v_spin_id
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

        -- FIX: Add to Points Activity Log (0 points) for visibility
        INSERT INTO public.points_transactions (
            user_id,
            transaction_type,
            points,
            description,
            reference_id
        ) VALUES (
            v_user_id,
            'earned_spin',
            0,
            'Won Prize: ' || v_prize.label,
            v_spin_id
        );
    
    ELSIF v_prize.type = 'loss' THEN
          -- Log loss? Optional. Maybe "Better luck next time"
          INSERT INTO public.points_transactions (
            user_id,
            transaction_type,
            points,
            description,
            reference_id
        ) VALUES (
            v_user_id,
            'earned_spin',
            0,
            'Daily Spin: No Prize',
            v_spin_id
        );

    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'prize', to_jsonb(v_prize),
        'spin_id', v_spin_id
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
