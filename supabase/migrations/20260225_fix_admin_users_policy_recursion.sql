-- Fix infinite recursion in admin_users RLS policies.
-- Cause: policies referencing public.admin_users inside public.admin_users policy expressions.
-- Solution: evaluate super-admin status through a SECURITY DEFINER helper.

CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE id = auth.uid()
      AND role = 'super_admin'
      AND (
        status = 'active'::public.admin_status
        OR (status IS NULL AND COALESCE(active, false) = true)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_super_admin() TO authenticated;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_read_all" ON public.admin_users;
CREATE POLICY "super_admin_read_all"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_current_user_super_admin());

DROP POLICY IF EXISTS "super_admin_write" ON public.admin_users;
CREATE POLICY "super_admin_write"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.is_current_user_super_admin())
WITH CHECK (public.is_current_user_super_admin());

-- Optional: simplify audit-log policies to use the same helper.
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_read_audit_log" ON public.admin_audit_log;
CREATE POLICY "super_admin_read_audit_log"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (public.is_current_user_super_admin());
