-- Link Check-ins to Nice Level Increase
-- Trigger: checks for new check-in and calls award_visit_bonus

CREATE OR REPLACE FUNCTION public.process_checkin_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Run as admin to ensure permission to update nice_accounts
AS $$
DECLARE
  v_bonus_multiplier decimal(4,2) := 0.5; -- Boost amount
  v_bonus_nice integer := 0; -- Removed as per request (was 500)
  v_duration interval := interval '24 hours';
  v_expires_at timestamptz;
  v_current_multiplier decimal(4,2);
  v_new_multiplier decimal(4,2);
  v_account_id uuid;
BEGIN
  v_expires_at := now() + v_duration;

  -- 1. Ensure Nice Account Exists (Safety)
  SELECT id, current_multiplier INTO v_account_id, v_current_multiplier
  FROM public.nice_accounts
  WHERE user_id = NEW.user_id;

  IF v_account_id IS NULL THEN
    INSERT INTO public.nice_accounts (user_id) VALUES (NEW.user_id)
    RETURNING id, current_multiplier INTO v_account_id, v_current_multiplier;
  END IF;

  -- 2. Calculate New Multiplier (Max cap at 5.0 for sanity?)
  v_new_multiplier := v_current_multiplier + v_bonus_multiplier;
  IF v_new_multiplier > 5.0 THEN
      v_new_multiplier := 5.0;
  END IF;

  -- 3. Call Award Function (Reuse logic if possible, or direct update)
  -- Since we are already in a trigger, direct update is efficient and avoids complex casting for existing function call if signature mismatches.
  -- But we have `award_visit_bonus`. Let's use it if we can, or just implementing logic here is safer for a focused trigger.
  
  -- Let's do direct update to be precise about the "Boost" logic (additive) vs "Set" logic.
  
  UPDATE public.nice_accounts
  SET 
    current_multiplier = v_new_multiplier,
    multiplier_expires_at = v_expires_at,
    nice_collected_balance = nice_collected_balance + v_bonus_nice,
    total_nice_earned = total_nice_earned + v_bonus_nice,
    updated_at = now()
  WHERE user_id = NEW.user_id;

  -- 4. Log Transaction
  INSERT INTO public.nice_transactions (
    user_id, transaction_type, nice_amount, metadata
  ) VALUES (
    NEW.user_id, 
    'visit_bonus', 
    v_bonus_nice,
    jsonb_build_object(
      'source', 'check_in',
      'check_in_id', NEW.id,
      'location', NEW.location,
      'multiplier_boost', v_bonus_multiplier,
      'new_multiplier', v_new_multiplier,
      'expires_at', v_expires_at
    )
  );

  -- 5. Log Multiplier History
  INSERT INTO public.visit_multipliers (
    user_id, multiplier, reason, expires_at
  ) VALUES (
    NEW.user_id, v_new_multiplier, 'Check-in at ' || NEW.location, v_expires_at
  );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any (to be safe during dev)
DROP TRIGGER IF EXISTS on_checkin_award_bonus ON public.check_ins;

-- Create Trigger
CREATE TRIGGER on_checkin_award_bonus
  AFTER INSERT ON public.check_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.process_checkin_bonus();
