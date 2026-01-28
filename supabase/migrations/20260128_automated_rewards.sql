-- Add metadata to redemptions if missing
ALTER TABLE public.redemptions ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Update automations check constraint to include 'milestone'
ALTER TABLE public.automations DROP CONSTRAINT IF EXISTS automations_type_check;
ALTER TABLE public.automations ADD CONSTRAINT automations_type_check 
  CHECK (type IN ('welcome', 'birthday', 'win_back', 'milestone'));

-- RPC: Admin Grant Reward (Manual Gift)
CREATE OR REPLACE FUNCTION admin_grant_reward(
  p_user_id uuid, 
  p_reward_id uuid, 
  p_notes text DEFAULT null
)
RETURNS jsonb AS $$
DECLARE
  v_reward record;
  v_redemption_id uuid;
  v_voucher_code text;
BEGIN
  -- Check permission
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND active = true) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Get reward details
  SELECT * INTO v_reward FROM public.rewards WHERE id = p_reward_id;
  IF v_reward IS NULL THEN
    RAISE EXCEPTION 'Reward not found';
  END IF;

  -- Generate voucher
  v_voucher_code := upper(substring(md5(random()::text) from 1 for 8));

  -- Insert redemption (Approved immediately, 0 points spent)
  INSERT INTO public.redemptions (
    user_id,
    reward_id,
    points_spent,
    status,
    voucher_code,
    expires_at,
    redeemed_by_staff, -- Mark who gifted it
    notes,
    metadata
  ) VALUES (
    p_user_id,
    p_reward_id,
    0, -- Free gift
    'approved',
    v_voucher_code,
    now() + (COALESCE(v_reward.expires_days, 30) || ' days')::interval,
    auth.uid(),
    COALESCE(p_notes, 'Admin Gift'),
    jsonb_build_object('gifted_by', auth.uid(), 'source', 'admin_gift')
  ) RETURNING id INTO v_redemption_id;

  RETURN jsonb_build_object('success', true, 'redemption_id', v_redemption_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC: Process Automation (Internal Logic)
CREATE OR REPLACE FUNCTION process_automation(
  p_trigger_type text,
  p_user_id uuid,
  p_trigger_value integer DEFAULT 0 -- e.g. visit count
)
RETURNS void AS $$
DECLARE
  v_automation record;
  v_reward record;
  v_voucher_code text;
BEGIN
  -- Loop through active automations matching the type
  FOR v_automation IN 
    SELECT * FROM public.automations 
    WHERE type = p_trigger_type AND active = true
  LOOP
    
    -- Check specific conditions
    -- Milestone: Check if visits matches the setting
    IF p_trigger_type = 'milestone' THEN
       -- settings: { "visits_required": 5 }
       IF (v_automation.trigger_settings->>'visits_required')::int IS DISTINCT FROM p_trigger_value THEN
         CONTINUE; -- Skip if not matching visit count
       END IF;
    END IF;

    -- Check if already executed for this user (prevent duplicates for Welcome/Milestone)
    -- For Birthday, we might want yearly, but for now let's stick to simple log check
    IF EXISTS (
      SELECT 1 FROM public.automation_logs 
      WHERE automation_id = v_automation.id AND user_id = p_user_id
    ) THEN
      CONTINUE; 
    END IF;

    -- Execute Reward if configured
    IF v_automation.reward_id IS NOT NULL THEN
       SELECT * INTO v_reward FROM public.rewards WHERE id = v_automation.reward_id;
       
       IF v_reward IS NOT NULL THEN
         v_voucher_code := upper(substring(md5(random()::text) from 1 for 8));
         
         INSERT INTO public.redemptions (
            user_id,
            reward_id,
            points_spent,
            status,
            voucher_code,
            expires_at,
            notes,
            metadata
         ) VALUES (
            p_user_id,
            v_reward.id,
            0,
            'approved',
            v_voucher_code,
            now() + (COALESCE(v_reward.expires_days, 30) || ' days')::interval,
            'Automated Reward: ' || v_automation.name,
            jsonb_build_object('automation_id', v_automation.id, 'source', 'automation')
         );
       END IF;
    END IF;

    -- Log execution
    INSERT INTO public.automation_logs (automation_id, user_id)
    VALUES (v_automation.id, p_user_id);

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Trigger: Welcome Automation on Signup
CREATE OR REPLACE FUNCTION trigger_welcome_automation()
RETURNS TRIGGER AS $$
BEGIN
  -- user_id is NEW.id
  PERFORM process_automation('welcome', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_automation ON public.profiles;
CREATE TRIGGER on_profile_created_automation
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_welcome_automation();


-- Trigger: Milestone Automation on Purchase (Visit Increment)
-- Note: update_user_stats_after_purchase updates profiles.total_visits
-- We attach to profiles update to catch the new total
CREATE OR REPLACE FUNCTION trigger_milestone_automation()
RETURNS TRIGGER AS $$
BEGIN
  -- If total_visits changed
  IF NEW.total_visits IS DISTINCT FROM OLD.total_visits THEN
     PERFORM process_automation('milestone', NEW.id, NEW.total_visits);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_visit_update ON public.profiles;
CREATE TRIGGER on_profile_visit_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_milestone_automation();
