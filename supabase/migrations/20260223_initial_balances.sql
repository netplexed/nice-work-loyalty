-- Migration: Support Decimal Nice Balances and Initial Promos
-- Description: Alters nice balances to support 2 decimal places and sets starting balances for new users.

-- 1. Alter Column Types
ALTER TABLE public.nice_accounts ALTER COLUMN nice_collected_balance TYPE numeric(10,2);
ALTER TABLE public.nice_transactions ALTER COLUMN nice_amount TYPE numeric(10,2);

-- 2. Update the signup trigger to grant initial Nice balance
CREATE OR REPLACE FUNCTION public.create_nice_account_on_signup()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.nice_accounts (user_id, nice_collected_balance)
  VALUES (NEW.id, 23.75);
  RETURN NEW;
END;
$$;

-- 3. Update convert_nice_to_points to accept numeric
DROP FUNCTION IF EXISTS public.convert_nice_to_points(uuid, integer);

CREATE OR REPLACE FUNCTION public.convert_nice_to_points(
    p_user_id uuid,
    p_nice_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_nice_balance numeric(10,2);
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
    -- Using floor to give whole points
    v_points_to_gain := floor(p_nice_amount / c_conversion_rate)::integer;
    
    IF v_points_to_gain < 1 THEN
         RAISE EXCEPTION 'Amount results in 0 points';
    END IF;

    -- 3. Update Nice Account (Deduct)
    PERFORM 1 FROM public.nice_accounts 
    WHERE user_id = p_user_id AND nice_collected_balance >= p_nice_amount
    FOR UPDATE;
    
    IF NOT FOUND THEN
         RAISE EXCEPTION 'Insufficient Nice balance';
    END IF;

    UPDATE public.nice_accounts
    SET nice_collected_balance = nice_collected_balance - p_nice_amount
    WHERE user_id = p_user_id
    RETURNING nice_collected_balance INTO v_new_nice_balance;
    
    -- 4. Log Transactions
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

    SELECT points_balance
    INTO v_new_points_balance
    FROM public.profiles
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'new_nice_balance', v_new_nice_balance,
        'new_points_balance', v_new_points_balance,
        'points_gained', v_points_to_gain
    );
END;
$$;

-- 4. Update collect_nice_transaction to use numeric
DROP FUNCTION IF EXISTS public.collect_nice_transaction(uuid);

CREATE OR REPLACE FUNCTION public.collect_nice_transaction(
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
  v_amount_to_collect numeric(10,2);
  v_tank_amount numeric;
  v_new_balance numeric(10,2);
  
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
  
  -- 3. Calculate Pending Amount
  IF v_multiplier_expires IS NOT NULL AND v_multiplier_expires > v_now THEN
    v_hours_diff := EXTRACT(EPOCH FROM (v_now - v_last_collected)) / 3600.0;
    v_tank_amount := v_hours_diff * v_base_rate * v_current_mult * v_tier_bonus;
  ELSIF v_multiplier_expires IS NOT NULL AND v_multiplier_expires > v_last_collected THEN
    v_hours_with_mult := EXTRACT(EPOCH FROM (v_multiplier_expires - v_last_collected)) / 3600.0;
    v_hours_without_mult := EXTRACT(EPOCH FROM (v_now - v_multiplier_expires)) / 3600.0;
    v_tank_amount := (v_hours_with_mult * v_base_rate * v_current_mult * v_tier_bonus) +
                     (v_hours_without_mult * v_base_rate * v_tier_bonus);
  ELSE
    v_hours_diff := EXTRACT(EPOCH FROM (v_now - v_last_collected)) / 3600.0;
    v_tank_amount := v_hours_diff * v_base_rate * v_tier_bonus;
  END IF;

  -- Round to 2 decimal places instead of floor
  v_amount_to_collect := round(v_tank_amount, 2);
  
  -- Cap at tank capacity
  IF v_amount_to_collect > v_account.tank_capacity THEN
    v_amount_to_collect := v_account.tank_capacity;
  END IF;

  -- Minimum 0.01 check (was 1 nice before)
  IF v_amount_to_collect < 0.01 THEN
    RAISE EXCEPTION 'Nothing to collect yet (min 0.01 Nice)';
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
