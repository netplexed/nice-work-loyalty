-- Fix: Remaining RLS recursion in core table admin-guarded policies.
--
-- The previous migration fixed admin_broadcasts, notifications, automations, etc.
-- But the initial schema's policies on profiles, points_transactions, rewards,
-- redemptions, campaigns, check_ins, referrals also query public.admin_users
-- directly, causing the same infinite recursion.
--
-- This migration fixes those remaining tables using the is_active_admin() helper
-- created in 20260225_fix_rls_admin_recursion.sql.

-- ────────────────────────────────────────────────────────────────────────────────
-- 1. profiles
-- ────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

-- ────────────────────────────────────────────────────────────────────────────────
-- 2. points_transactions
-- ────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.points_transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.points_transactions;

CREATE POLICY "Admins can view all transactions"
  ON public.points_transactions
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

CREATE POLICY "Admins can insert transactions"
  ON public.points_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_admin());

-- ────────────────────────────────────────────────────────────────────────────────
-- 3. rewards
-- ────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage rewards" ON public.rewards;

CREATE POLICY "Admins can manage rewards"
  ON public.rewards
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ────────────────────────────────────────────────────────────────────────────────
-- 4. redemptions
-- ────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage all redemptions" ON public.redemptions;

CREATE POLICY "Admins can manage all redemptions"
  ON public.redemptions
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ────────────────────────────────────────────────────────────────────────────────
-- 5. profiles UPDATE (from fix_points_and_profiles_rls)
-- ────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

CREATE POLICY "Admins can update profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_active_admin());

-- ────────────────────────────────────────────────────────────────────────────────
-- 6. check_ins (from fix_points_and_profiles_rls)
-- ────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert check_ins" ON public.check_ins;

CREATE POLICY "Admins can insert check_ins"
  ON public.check_ins
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_admin());

-- ────────────────────────────────────────────────────────────────────────────────
-- 7. purchases (from fix_purchases_rls)
-- ────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins can view purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins can manage purchases" ON public.purchases;

CREATE POLICY "Admins can insert purchases"
  ON public.purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Admins can view purchases"
  ON public.purchases
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

