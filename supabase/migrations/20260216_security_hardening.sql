-- Migration: Security Hardening
-- Description:
-- 1) Remove unsafe Nice RPC overloads and permissive write access
-- 2) Restrict direct visit bonus RPC usage and add admin-safe visit multiplier RPC
-- 3) Harden lottery purchase RPC against parameter tampering
-- 4) Disable authenticated execution of debug reset RPCs

-- 1. Remove legacy unsafe function overloads (client-controlled amount/points).
DROP FUNCTION IF EXISTS public.collect_nice_transaction(uuid, integer);
DROP FUNCTION IF EXISTS public.convert_nice_to_points(uuid, integer, integer);

-- 2. Remove permissive policies that allowed direct writes to Nice economy tables.
DROP POLICY IF EXISTS "Users can insert own nice transactions" ON public.nice_transactions;
DROP POLICY IF EXISTS "Users can insert own visit multipliers" ON public.visit_multipliers;
DROP POLICY IF EXISTS "Users can update own nice account" ON public.nice_accounts;

-- 3. Remove broad table privileges and re-grant read-only access for authenticated users.
REVOKE ALL ON TABLE public.nice_accounts FROM authenticated;
REVOKE ALL ON TABLE public.nice_transactions FROM authenticated;
REVOKE ALL ON TABLE public.visit_multipliers FROM authenticated;

GRANT SELECT ON TABLE public.nice_accounts TO authenticated;
GRANT SELECT ON TABLE public.nice_transactions TO authenticated;
GRANT SELECT ON TABLE public.visit_multipliers TO authenticated;

-- 4. Tighten legacy visit bonus RPC to admin/service-role callers only.
CREATE OR REPLACE FUNCTION public.award_visit_bonus(
  p_user_id uuid,
  p_multiplier numeric,
  p_expires_at timestamptz,
  p_bonus_nice integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_multiplier numeric;
  v_new_balance integer;
BEGIN
  IF auth.role() <> 'service_role'
     AND NOT EXISTS (
       SELECT 1
       FROM public.admin_users
       WHERE id = auth.uid()
         AND active = true
     ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_bonus_nice <> 0 THEN
    RAISE EXCEPTION 'Direct visit bonus Nice is disabled';
  END IF;

  IF p_multiplier < 1.0 OR p_multiplier > 5.0 THEN
    RAISE EXCEPTION 'Invalid multiplier';
  END IF;

  INSERT INTO public.nice_accounts (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT current_multiplier INTO v_previous_multiplier
  FROM public.nice_accounts
  WHERE user_id = p_user_id;

  UPDATE public.nice_accounts
  SET
    current_multiplier = p_multiplier,
    multiplier_expires_at = p_expires_at,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING nice_collected_balance INTO v_new_balance;

  INSERT INTO public.nice_transactions (
    user_id, transaction_type, nice_amount, metadata
  ) VALUES (
    p_user_id, 'visit_bonus', 0,
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

REVOKE EXECUTE ON FUNCTION public.award_visit_bonus(uuid, numeric, timestamptz, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.award_visit_bonus(uuid, numeric, timestamptz, integer) TO service_role;

-- 5. New hardened RPC for spend-backed visit multiplier updates.
CREATE OR REPLACE FUNCTION public.admin_apply_visit_multiplier(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_visits integer := 0;
  v_multiplier numeric := 1.5;
  v_expires_at timestamptz := now() + interval '24 hours';
BEGIN
  IF auth.role() <> 'service_role'
     AND NOT EXISTS (
       SELECT 1
       FROM public.admin_users
       WHERE id = auth.uid()
         AND active = true
     ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT count(*)
  INTO v_recent_visits
  FROM public.purchases
  WHERE user_id = p_user_id
    AND created_at >= now() - interval '7 days';

  IF v_recent_visits >= 3 THEN
    v_multiplier := 3.0;
  ELSIF v_recent_visits >= 2 THEN
    v_multiplier := 2.0;
  ELSE
    v_multiplier := 1.5;
  END IF;

  PERFORM public.award_visit_bonus(
    p_user_id,
    v_multiplier,
    v_expires_at,
    0
  );

  RETURN jsonb_build_object(
    'success', true,
    'recent_visits', v_recent_visits,
    'multiplier', v_multiplier,
    'expires_at', v_expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_apply_visit_multiplier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_apply_visit_multiplier(uuid) TO service_role;

-- 6. Harden lottery purchase RPC.
CREATE OR REPLACE FUNCTION public.purchase_lottery_entries(
  p_user_id uuid,
  p_quantity integer,
  p_drawing_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nice_balance integer;
  v_cost integer;
  v_current_entries integer;
  v_new_balance integer;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 10 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Quantity must be between 1 and 10');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.lottery_drawings
    WHERE id = p_drawing_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Drawing is not active');
  END IF;

  SELECT COALESCE(sum(quantity), 0)
  INTO v_current_entries
  FROM public.lottery_entries
  WHERE user_id = p_user_id
    AND drawing_id = p_drawing_id
    AND entry_type = 'purchased';

  IF (v_current_entries + p_quantity) > 10 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Purchase limit exceeded (Max 10)');
  END IF;

  v_cost := p_quantity * 200;

  SELECT nice_collected_balance
  INTO v_nice_balance
  FROM public.nice_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_nice_balance IS NULL OR v_nice_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient nice balance');
  END IF;

  UPDATE public.nice_accounts
  SET
    nice_collected_balance = nice_collected_balance - v_cost,
    total_nice_spent = total_nice_spent + v_cost,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING nice_collected_balance INTO v_new_balance;

  INSERT INTO public.nice_transactions (
    user_id, transaction_type, nice_amount, metadata
  ) VALUES (
    p_user_id, 'lottery_purchase', -v_cost,
    jsonb_build_object('drawing_id', p_drawing_id, 'quantity', p_quantity)
  );

  INSERT INTO public.lottery_entries (
    drawing_id, user_id, entry_type, quantity, nice_spent
  ) VALUES (
    p_drawing_id, p_user_id, 'purchased', p_quantity, v_cost
  );

  PERFORM public.recalculate_lottery_stats(p_drawing_id);

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'entries_purchased', p_quantity
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_lottery_entries(uuid, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_lottery_entries(uuid, integer, uuid) TO service_role;

-- 7. Disable debug spin reset RPC for authenticated users.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'debug_reset_daily_spin'
      AND p.pronargs = 1
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.debug_reset_daily_spin(uuid) FROM authenticated;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'debug_reset_daily_spin'
      AND p.pronargs = 0
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.debug_reset_daily_spin() FROM authenticated;
  END IF;
END $$;
