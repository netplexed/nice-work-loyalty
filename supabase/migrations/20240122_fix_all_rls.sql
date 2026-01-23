-- Comprehensive RLS Fix (Corrected)
-- Run this to fix all permission issues. Safe to re-run.

-- 1. Profiles: Allow insertion (Creation)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Referrals: Allow insertion (Generating code) and viewing
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Users can insert referrals" ON public.referrals;
CREATE POLICY "Users can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

-- 3. Check-ins: Allow insertion
DROP POLICY IF EXISTS "Users can insert checkins" ON public.check_ins;
CREATE POLICY "Users can insert checkins"
  ON public.check_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own checkins" ON public.check_ins;
CREATE POLICY "Users can view own checkins"
  ON public.check_ins FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Spins: Allow insertion
DROP POLICY IF EXISTS "Users can insert spins" ON public.spins;
CREATE POLICY "Users can insert spins"
  ON public.spins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Points Transactions: Allow insertion for system actions
DROP POLICY IF EXISTS "Users can insert own points" ON public.points_transactions;
CREATE POLICY "Users can insert own points"
  ON public.points_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
