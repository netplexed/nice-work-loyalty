-- Migration: Secure Nice RPCs
-- Description: Refactors collection and conversion functions to be secure by design (Server-side calculation)

-- 1. Secure Collection Function
-- No longer accepts 'amount' from client. Calculates trustlessly based on time.
CREATE OR REPLACE FUNCTION collect_nice_transaction(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.nice_accounts%ROWTYPE;
  v_now timestamptz := now();
  v_last_collected timestamptz;
  v_hours_diff numeric;
  v_amount_to_collect integer;
  v_tank_amount numeric;
  v_new_balance integer;
  
  -- Calculation variables
  v_multiplier_expires timestamptz;
  v_base_rate numeric;
  v_current_mult numeric;
  v_tier_bonus numeric;
  
  v_hours_with_mult numeric;
  v_hours_without_mult numeric;
BEGIN
  -- 1. Auth check
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Fetch Account State (Locking row to prevent race conditions)
  SELECT * INTO v_account
  FROM public.nice_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nice account not found';
  END IF;

  v_last_collected := v_account.tank_last_collected_at;
  v_multiplier_expires := v_account.multiplier_expires_at;
  v_base_rate := v_account.base_rate; -- Default 2.0
  v_current_mult := v_account.current_multiplier;
  v_tier_bonus := v_account.tier_bonus;
  
  -- 3. Calculate Pending Amount (Replicating client logic in SQL)
  -- Logic:
  -- IF multiplier active: Rate = Base * Mult * Tier
  -- IF multiplier expired midway: Split calculation
  -- IF no multiplier: Rate = Base * Tier
  
  IF v_multiplier_expires IS NOT NULL AND v_multiplier_expires > v_now THEN
    -- Case A: Multiplier still active for whole duration (or since last collect)
    -- Wait, if last_collected > multiplier_expires (impossible if check above passes? no.)
    -- Simple case: Active now, and was active then?
    -- Actually, if active now, it covers the whole period SINCE last_collected (assuming last_collected < now)
    -- strictly speaking, last_collected could be BEFORE the multiplier started... 
    -- BUT our system updates 'tank_last_collected' inside 'award_visit_bonus' usually?
    -- Actually 'award_visit_bonus' does NOT reset tank time. It just sets multiplier.
    -- So we might have a period of non-multiplier followed by multiplier? 
    -- COMPLEXITY: For this MVP fix, we will assume the multiplier applies to the *current tank session* if it is active NOW.
    -- Better approximation of client logic:
    
    v_hours_diff := EXTRACT(EPOCH FROM (v_now - v_last_collected)) / 3600.0;
    
    -- Rate = Base * Mult * Tier
    v_tank_amount := v_hours_diff * v_base_rate * v_current_mult * v_tier_bonus;
    
  ELSIF v_multiplier_expires IS NOT NULL AND v_multiplier_expires > v_last_collected THEN
    -- Case B: Multiplier expired midway
    
    -- Period 1: With Multiplier
    v_hours_with_mult := EXTRACT(EPOCH FROM (v_multiplier_expires - v_last_collected)) / 3600.0;
    -- Period 2: Without Multiplier
    v_hours_without_mult := EXTRACT(EPOCH FROM (v_now - v_multiplier_expires)) / 3600.0;
    
    v_tank_amount := (v_hours_with_mult * v_base_rate * v_current_mult * v_tier_bonus) +
                     (v_hours_without_mult * v_base_rate * v_tier_bonus);
                     
  ELSE
    -- Case C: No multiplier or expired before last collection
    v_hours_diff := EXTRACT(EPOCH FROM (v_now - v_last_collected)) / 3600.0;
    v_tank_amount := v_hours_diff * v_base_rate * v_tier_bonus;
  END IF;

  -- 4. Floor and Clamp
  v_amount_to_collect := floor(v_tank_amount)::integer;
  
  -- Cap at tank capacity
  IF v_amount_to_collect > v_account.tank_capacity THEN
    v_amount_to_collect := v_account.tank_capacity;
  END IF;

  -- Minimum 1 check
  IF v_amount_to_collect < 1 THEN
    RAISE EXCEPTION 'Nothing to collect yet (min 1 Nice)';
  END IF;

  -- 5. Commit Updates
  UPDATE public.nice_accounts
  SET 
    nice_collected_balance = nice_collected_balance + v_amount_to_collect,
    tank_last_collected_at = v_now,
    total_nice_earned = total_nice_earned + v_amount_to_collect,
    total_collections = total_collections + 1,
    updated_at = v_now
  WHERE user_id = p_user_id
  RETURNING nice_collected_balance INTO v_new_balance;
  
  -- 6. Log Transaction
  INSERT INTO public.nice_transactions (
    user_id,
    transaction_type,
    nice_amount,
    metadata
  ) VALUES (
    p_user_id,
    'collected',
    v_amount_to_collect,
    jsonb_build_object(
        'collection_timestamp', v_now, 
        'new_balance', v_new_balance,
        'calculated_from_hours', v_hours_diff,
        'secure_mode', true
    )
  );
  
  RETURN jsonb_build_object('new_balance', v_new_balance, 'collected', v_amount_to_collect, 'success', true);
END;
$$;


-- 2. Secure Conversion Function
-- No longer accepts 'points_amount' (the result). Only accepts 'nice_amount' (the cost).
CREATE OR REPLACE FUNCTION convert_nice_to_points(
    p_user_id uuid,
    p_nice_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_nice_balance integer;
    v_new_points_balance integer;
    v_points_to_gain integer;
    c_conversion_rate integer := 4; -- CONSTANT: 4 Nice = 1 Point
BEGIN
    -- 1. Auth & Validation
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    IF p_nice_amount < 4 THEN
        RAISE EXCEPTION 'Minimum 4 Nice required';
    END IF;
    
    -- 2. Calculate Points Server-Side
    v_points_to_gain := floor(p_nice_amount / c_conversion_rate);
    
    IF v_points_to_gain < 1 THEN
         RAISE EXCEPTION 'Amount results in 0 points';
    END IF;

    -- 3. Update Nice Account (Deduct)
    -- Check balance (implicitly checked by check constraint usually, but we do explicit check to be nice)
    -- Actually we'll let SQL handle the "negative balance" constraint if it exists, or check manually.
    -- (Assuming no check constraint exists yet, checking manually is safer)
    
    PERFORM 1 FROM public.nice_accounts 
    WHERE user_id = p_user_id AND nice_collected_balance >= p_nice_amount;
    
    IF NOT FOUND THEN
         RAISE EXCEPTION 'Insufficient Nice balance';
    END IF;

    UPDATE public.nice_accounts
    SET nice_collected_balance = nice_collected_balance - p_nice_amount
    WHERE user_id = p_user_id
    RETURNING nice_collected_balance INTO v_new_nice_balance;
    
    -- 4. Update Profile (Add Points)
    UPDATE public.profiles
    SET points_balance = points_balance + v_points_to_gain
    WHERE id = p_user_id
    RETURNING points_balance INTO v_new_points_balance;

    -- 5. Log Transactions
    INSERT INTO public.nice_transactions (
        user_id, transaction_type, nice_amount, metadata
    ) VALUES (
        p_user_id, 'converted_to_points', -p_nice_amount,
        jsonb_build_object('points_gained', v_points_to_gain, 'rate', c_conversion_rate)
    );
    
    INSERT INTO public.points_transactions (
        user_id, transaction_type, points, description, created_at
    ) VALUES (
        p_user_id, 'earned_bonus', v_points_to_gain, 'Converted from Nice', now()
    );

    RETURN jsonb_build_object(
        'new_nice_balance', v_new_nice_balance,
        'new_points_balance', v_new_points_balance,
        'points_gained', v_points_to_gain
    );
END;
$$;
