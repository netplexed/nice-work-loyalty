-- FIX: "Failed to award points"
-- The issue: When Admin inserts points, a trigger fires to update "profiles".
-- But Admins do NOT have permission to UPDATE "profiles" for other users.

-- 1. Allow Admins to UPDATE profiles
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND active = true
  )
);

-- 2. Ensure Admin Users table is readable (Redundant but safe)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
CREATE POLICY "Admins can view admin_users"
ON public.admin_users
FOR SELECT
TO authenticated
USING ( auth.uid() = id );

-- 3. Ensure Admins can INSERT points_transactions
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.points_transactions;
CREATE POLICY "Admins can insert transactions"
ON public.points_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND active = true
  )
);

-- 4. Ensure Admins can INSERT check_ins
DROP POLICY IF EXISTS "Admins can insert check_ins" ON public.check_ins;
CREATE POLICY "Admins can insert check_ins"
ON public.check_ins
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND active = true
  )
);
