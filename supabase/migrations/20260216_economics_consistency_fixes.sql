-- Migration: Economics Consistency Fixes
-- Description:
-- 1) Normalize spin/nice schema constraints to match runtime behavior
-- 2) Align referral_redemptions default with current referee reward
-- 3) Keep nice_accounts.tier_bonus in sync with profiles.tier
-- 4) Fix lottery visit bonus integrity checks and stats recalculation
-- 5) Ensure lottery_entries.visit_id references purchases (visit = recorded spend)

-- 1. Spin prizes: allow "nice" as a prize type.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'spin_prizes'
  ) THEN
    ALTER TABLE public.spin_prizes
      DROP CONSTRAINT IF EXISTS spin_prizes_type_check;

    ALTER TABLE public.spin_prizes
      ADD CONSTRAINT spin_prizes_type_check
      CHECK (type IN ('points', 'reward', 'loss', 'nice'));
  END IF;
END $$;

-- 2. nice_transactions: ensure description column exists and supported transaction types are complete.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'nice_transactions'
  ) THEN
    ALTER TABLE public.nice_transactions
      ADD COLUMN IF NOT EXISTS description text;

    ALTER TABLE public.nice_transactions
      DROP CONSTRAINT IF EXISTS nice_transactions_transaction_type_check;

    ALTER TABLE public.nice_transactions
      ADD CONSTRAINT nice_transactions_transaction_type_check
      CHECK (transaction_type IN (
        'generated', 'collected', 'visit_bonus', 'converted_to_points',
        'gifted_sent', 'gifted_received', 'auction_bid', 'auction_refund',
        'raffle_ticket', 'donation', 'store_purchase', 'flash_sale',
        'expired', 'adjusted',
        'lottery_purchase', 'lottery_refund',
        'spin_win'
      ));
  END IF;
END $$;

-- 3. Referral redemptions: default referee award should match current app logic (100).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'referral_redemptions'
      AND column_name = 'points_awarded'
  ) THEN
    ALTER TABLE public.referral_redemptions
      ALTER COLUMN points_awarded SET DEFAULT 100;
  END IF;
END $$;

-- 4. Tier-to-bonus mapping helper.
CREATE OR REPLACE FUNCTION public.map_tier_to_bonus(p_tier text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE lower(coalesce(p_tier, 'bronze'))
    WHEN 'platinum' THEN RETURN 2.5;
    WHEN 'gold' THEN RETURN 2.0;
    WHEN 'silver' THEN RETURN 1.5;
    ELSE RETURN 1.0;
  END CASE;
END;
$$;

-- 5. Keep nice_accounts tier_bonus synced when profile tier changes.
CREATE OR REPLACE FUNCTION public.sync_nice_tier_bonus_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.nice_accounts
  SET
    tier_bonus = public.map_tier_to_bonus(NEW.tier),
    updated_at = now()
  WHERE user_id = NEW.id
    AND tier_bonus IS DISTINCT FROM public.map_tier_to_bonus(NEW.tier);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_tier_sync_nice_bonus ON public.profiles;
CREATE TRIGGER on_profile_tier_sync_nice_bonus
  AFTER INSERT OR UPDATE OF tier ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_nice_tier_bonus_from_profile();

-- 6. Initialize tier_bonus correctly when a nice account is created.
CREATE OR REPLACE FUNCTION public.set_nice_tier_bonus_on_account_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_tier text;
BEGIN
  SELECT tier INTO v_tier
  FROM public.profiles
  WHERE id = NEW.user_id;

  NEW.tier_bonus := public.map_tier_to_bonus(v_tier);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_nice_account_insert_set_tier_bonus ON public.nice_accounts;
CREATE TRIGGER before_nice_account_insert_set_tier_bonus
  BEFORE INSERT ON public.nice_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_nice_tier_bonus_on_account_insert();

-- 7. Backfill tier_bonus to match existing profile tiers.
UPDATE public.nice_accounts na
SET
  tier_bonus = public.map_tier_to_bonus(p.tier),
  updated_at = now()
FROM public.profiles p
WHERE p.id = na.user_id
  AND na.tier_bonus IS DISTINCT FROM public.map_tier_to_bonus(p.tier);

-- 8. Recalculate drawing stats using quantity sums (not row counts).
CREATE OR REPLACE FUNCTION public.recalculate_lottery_stats(p_drawing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.lottery_drawings
  SET
    total_entries = (
      SELECT COALESCE(sum(quantity), 0)
      FROM public.lottery_entries
      WHERE drawing_id = p_drawing_id
    ),
    total_participants = (
      SELECT count(DISTINCT user_id)
      FROM public.lottery_entries
      WHERE drawing_id = p_drawing_id
    ),
    updated_at = now()
  WHERE id = p_drawing_id;
END;
$$;

-- 9. lottery_entries.visit_id should reference purchases.
DO $$
DECLARE
  v_constraint record;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lottery_entries'
  ) THEN
    FOR v_constraint IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN unnest(c.conkey) AS ck(attnum) ON true
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ck.attnum
      WHERE n.nspname = 'public'
        AND t.relname = 'lottery_entries'
        AND c.contype = 'f'
        AND a.attname = 'visit_id'
    LOOP
      EXECUTE format('ALTER TABLE public.lottery_entries DROP CONSTRAINT IF EXISTS %I', v_constraint.conname);
    END LOOP;

    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'purchases'
    ) THEN
      ALTER TABLE public.lottery_entries
        ADD CONSTRAINT lottery_entries_visit_id_fkey
        FOREIGN KEY (visit_id)
        REFERENCES public.purchases(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 10. Harden lottery visit bonus: require valid purchase ownership and active drawing.
CREATE OR REPLACE FUNCTION public.award_lottery_visit_bonus(
  p_user_id uuid,
  p_visit_id uuid,
  p_drawing_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_bonus_count integer;
  v_week_start date;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.lottery_drawings
    WHERE id = p_drawing_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Drawing is not active');
  END IF;

  SELECT week_start_date
  INTO v_week_start
  FROM public.lottery_drawings
  WHERE id = p_drawing_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.purchases
    WHERE id = p_visit_id
      AND user_id = p_user_id
      AND created_at >= v_week_start::timestamptz
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid visit record');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.lottery_entries
    WHERE visit_id = p_visit_id
      AND entry_type = 'visit'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bonus already awarded for this visit');
  END IF;

  SELECT COALESCE(sum(quantity), 0)
  INTO v_current_bonus_count
  FROM public.lottery_entries
  WHERE user_id = p_user_id
    AND drawing_id = p_drawing_id
    AND entry_type = 'visit';

  IF v_current_bonus_count >= 3 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Max visit bonuses reached for this week');
  END IF;

  INSERT INTO public.lottery_entries (
    drawing_id, user_id, entry_type, quantity, visit_id
  ) VALUES (
    p_drawing_id, p_user_id, 'visit', 1, p_visit_id
  );

  PERFORM public.recalculate_lottery_stats(p_drawing_id);

  RETURN jsonb_build_object('success', true, 'message', '+1 lottery entry earned!');
END;
$$;

-- 11. Harden weekly +2 visit entries: require at least one real purchase this drawing week.
CREATE OR REPLACE FUNCTION public.award_lottery_checkin_bonus(
  p_user_id uuid,
  p_drawing_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start date;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.lottery_drawings
    WHERE id = p_drawing_id
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Drawing is not active');
  END IF;

  SELECT week_start_date
  INTO v_week_start
  FROM public.lottery_drawings
  WHERE id = p_drawing_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.purchases
    WHERE user_id = p_user_id
      AND created_at >= v_week_start::timestamptz
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'No eligible visit found');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.lottery_entries
    WHERE user_id = p_user_id
      AND drawing_id = p_drawing_id
      AND entry_type = 'checkin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Weekly visit entries already earned this week');
  END IF;

  INSERT INTO public.lottery_entries (
    drawing_id, user_id, entry_type, quantity
  ) VALUES (
    p_drawing_id, p_user_id, 'checkin', 2
  );

  PERFORM public.recalculate_lottery_stats(p_drawing_id);

  RETURN jsonb_build_object('success', true, 'message', '+2 lottery entries! Thanks for visiting!');
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_lottery_visit_bonus(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_lottery_checkin_bonus(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_lottery_stats(uuid) TO authenticated;
