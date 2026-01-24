-- MASTER FIX FOR ALL NICE SYSTEM PERMISSIONS
-- Run this to resolve 42501 errors for Check-In and Collection

-- 1. Ensure nice_transactions allows inserts (safest fallback)
DROP POLICY IF EXISTS "Users can insert own nice transactions" ON public.nice_transactions;
CREATE POLICY "Users can insert own nice transactions"
ON public.nice_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 2. Ensure visit_multipliers allows inserts
DROP POLICY IF EXISTS "Users can insert own visit multipliers" ON public.visit_multipliers;
CREATE POLICY "Users can insert own visit multipliers"
ON public.visit_multipliers FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Ensure nice_accounts allows updates
DROP POLICY IF EXISTS "Users can update own nice account" ON public.nice_accounts;
CREATE POLICY "Users can update own nice account"
ON public.nice_accounts FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Re-define award_visit_bonus with SECURITY DEFINER (Force Override)
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
  -- Get previous multiplier
  SELECT current_multiplier INTO v_previous_multiplier
  FROM public.nice_accounts
  WHERE user_id = p_user_id;
  
  -- Update nice account
  UPDATE public.nice_accounts
  SET 
    nice_collected_balance = nice_collected_balance + p_bonus_nice,
    current_multiplier = p_multiplier,
    multiplier_expires_at = p_expires_at,
    total_nice_earned = total_nice_earned + p_bonus_nice,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING nice_collected_balance INTO v_new_balance;
  
  -- Record transaction
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
  
  -- Record multiplier history
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

-- 5. Grant executions
GRANT EXECUTE ON FUNCTION award_visit_bonus TO authenticated;
GRANT EXECUTE ON FUNCTION award_visit_bonus TO service_role;
GRANT ALL ON public.nice_transactions TO authenticated;
GRANT ALL ON public.visit_multipliers TO authenticated;
GRANT ALL ON public.nice_accounts TO authenticated;
