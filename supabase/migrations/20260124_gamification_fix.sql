-- Fix permissions for Gamification Phase

-- SPINS
-- Allow users to insert their own spins (already in initial schema but ensuring)
DROP POLICY IF EXISTS "Users can insert spins" ON public.spins;
CREATE POLICY "Users can insert spins"
  ON public.spins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own spins
DROP POLICY IF EXISTS "Users can view own spins" ON public.spins;
CREATE POLICY "Users can view own spins"
  ON public.spins FOR SELECT
  USING (auth.uid() = user_id);

-- Grant permissions to public role (authenticated users need these)
GRANT ALL ON public.spins TO authenticated;
GRANT ALL ON public.spins TO service_role;

-- REFERRALS
-- Allow users to view referrals where they are the referrer OR referee
DROP POLICY IF EXISTS "Users can view relevant referrals" ON public.referrals;
CREATE POLICY "Users can view relevant referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- Allow users to create referrals (when generating code)
DROP POLICY IF EXISTS "Users can insert referrals" ON public.referrals;
CREATE POLICY "Users can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

-- Allow users to update referrals (when redeeming code)
DROP POLICY IF EXISTS "Users can update referrals" ON public.referrals;
CREATE POLICY "Users can update referrals"
  ON public.referrals FOR UPDATE
  USING (true); -- Logic handled in server action/function, minimal RLS for now as we might use SERVICE_ROLE for redemption

GRANT ALL ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

-- Fix can_spin_today function 
-- Needs SECURITY DEFINER to ensure it can see all spins for logic if RLS is strict
CREATE OR REPLACE FUNCTION can_spin_today(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_spin timestamptz;
BEGIN
  -- Check for any daily spin today
  SELECT max(created_at) INTO last_spin
  FROM public.spins
  WHERE user_id = p_user_id
    AND spin_type = 'daily'
    AND created_at >= current_date; -- Using >= current_date covers "today"
  
  RETURN last_spin IS NULL;
END;
$$;
