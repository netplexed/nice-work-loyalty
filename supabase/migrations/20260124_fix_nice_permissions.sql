-- Fix permissions for Nice System functions
-- The previous functions were missing SECURITY DEFINER, causing 42501 errors because RLS blocked updates/inserts.

-- 1. Update collect_nice_transaction
CREATE OR REPLACE FUNCTION collect_nice_transaction(
  p_user_id uuid,
  p_nice_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Fix: Run as owner to bypass RLS for updates
SET search_path = public -- Fix: Security best practice
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  -- Verify user owns the account (double check for security since we are bypassing RLS)
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update nice account
  UPDATE public.nice_accounts
  SET 
    nice_collected_balance = nice_collected_balance + p_nice_amount,
    tank_last_collected_at = now(),
    total_nice_earned = total_nice_earned + p_nice_amount,
    total_collections = total_collections + 1,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING nice_collected_balance INTO v_new_balance;
  
  -- Record transaction
  INSERT INTO public.nice_transactions (
    user_id,
    transaction_type,
    nice_amount,
    metadata
  ) VALUES (
    p_user_id,
    'collected',
    p_nice_amount,
    jsonb_build_object('collection_timestamp', now(), 'new_balance', v_new_balance)
  );
  
  RETURN jsonb_build_object('new_balance', v_new_balance, 'success', true);
END;
$$;

-- 2. Update award_visit_bonus
CREATE OR REPLACE FUNCTION award_visit_bonus(
  p_user_id uuid,
  p_multiplier decimal(4,2),
  p_expires_at timestamptz,
  p_bonus_nice integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_multiplier decimal(4,2);
  v_new_balance integer;
BEGIN
  -- For server-side calls (service role), auth.uid() might be null or we might want to allow it.
  
  SELECT current_multiplier INTO v_previous_multiplier
  FROM public.nice_accounts
  WHERE user_id = p_user_id;
  
  UPDATE public.nice_accounts
  SET 
    nice_collected_balance = nice_collected_balance + p_bonus_nice,
    current_multiplier = p_multiplier,
    multiplier_expires_at = p_expires_at,
    total_nice_earned = total_nice_earned + p_bonus_nice,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING nice_collected_balance INTO v_new_balance;
  
  INSERT INTO public.nice_transactions (
    user_id, transaction_type, nice_amount, metadata
  ) VALUES (
    p_user_id, 'visit_bonus', p_bonus_nice,
    jsonb_build_object(
      'new_multiplier', p_multiplier,
      'previous_multiplier', v_previous_multiplier,
      'expires_at', p_expires_at
    )
  );
  
  INSERT INTO public.visit_multipliers (
    user_id, multiplier, reason, expires_at
  ) VALUES (
    p_user_id, p_multiplier, 'visit_bonus', p_expires_at
  );
  
  RETURN jsonb_build_object(
    'previous_multiplier', v_previous_multiplier,
    'new_balance', v_new_balance,
    'success', true
  );
END;
$$;

-- 3. Grant permissions just in case
GRANT EXECUTE ON FUNCTION collect_nice_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION award_visit_bonus TO authenticated;
GRANT EXECUTE ON FUNCTION award_visit_bonus TO service_role;
