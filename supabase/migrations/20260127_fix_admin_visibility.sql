-- FIX: Admins cannot see profiles (for audience resolution) or push subscriptions (for sending)

-- 1. Allow Admins to VIEW all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND active = true
  )
);

-- 2. Allow Admins to VIEW all push subscriptions
DROP POLICY IF EXISTS "Admins can view all push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admins can view all push subscriptions"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
    AND active = true
  )
);
