-- FIX: POS "Failed to record purchase"
-- The issue is that RLS policies check "admin_users" table, but the user doesn't have permission to read "admin_users", so the check fails.

-- 1. Allow Admins to READ admin_users (Required for the check to work)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
CREATE POLICY "Admins can view admin_users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (
  -- A user can see if they are an admin
  auth.uid() = id
  -- OR if they are already an active admin (recursive? no, just direct ID check is enough)
);

-- 2. Allow Admins to INSERT purchases
DROP POLICY IF EXISTS "Admins can insert purchases" ON public.purchases;
CREATE POLICY "Admins can insert purchases"
ON public.purchases
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND active = true
  )
);

-- 3. Allow Admins to VIEW purchases (needed for returning the result)
DROP POLICY IF EXISTS "Admins can view purchases" ON public.purchases;
CREATE POLICY "Admins can view purchases"
ON public.purchases
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND active = true
  )
);
