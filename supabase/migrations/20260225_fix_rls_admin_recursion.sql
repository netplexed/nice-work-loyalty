-- Fix: Infinite RLS recursion in admin-guarded policies.
--
-- Root cause: after `20260225_admin_staff_management.sql` added RLS to `admin_users`,
-- every other table whose policy does `SELECT FROM public.admin_users` now triggers
-- `admin_users` RLS, which in turn queries itself → infinite recursion.
--
-- Solution: create a SECURITY DEFINER function `is_active_admin()` that bypasses RLS
-- and use it in all affected policies.

-- ────────────────────────────────────────────────────────────────────────────────
-- 1. Helper function (SECURITY DEFINER bypasses RLS on admin_users)
-- ────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_active_admin()
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
      AND (
        status = 'active'::public.admin_status
        OR (status IS NULL AND COALESCE(active, false) = true)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────────
-- 2. admin_broadcasts policies
-- ────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage broadcasts" ON public.admin_broadcasts;

CREATE POLICY "Admins can manage broadcasts"
  ON public.admin_broadcasts
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ────────────────────────────────────────────────────────────────────────────────
-- 3. notifications policies (admin insert)
-- ────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

CREATE POLICY "Admins can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_admin());

-- ────────────────────────────────────────────────────────────────────────────────
-- 4. automations policies
-- ────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage automations" ON public.automations;

CREATE POLICY "Admins can manage automations"
  ON public.automations
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ────────────────────────────────────────────────────────────────────────────────
-- 5. automation_logs policies
-- ────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view logs" ON public.automation_logs;

CREATE POLICY "Admins can view logs"
  ON public.automation_logs
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

-- ────────────────────────────────────────────────────────────────────────────────
-- 6. email_templates policies
-- ────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;

CREATE POLICY "Admins can manage email templates"
  ON public.email_templates
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ────────────────────────────────────────────────────────────────────────────────
-- 7. email_campaigns policies
-- ────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Admins can view campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Admins can insert campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Admins can update campaigns" ON public.email_campaigns;

CREATE POLICY "Admins can manage campaigns"
  ON public.email_campaigns
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ────────────────────────────────────────────────────────────────────────────────
-- 8. marketing_workflows / workflow_enrollments policies
-- ────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage workflows" ON public.marketing_workflows;
DROP POLICY IF EXISTS "Admins can view enrollments" ON public.workflow_enrollments;
DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.workflow_enrollments;

CREATE POLICY "Admins can manage workflows"
  ON public.marketing_workflows
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Admins can manage enrollments"
  ON public.workflow_enrollments
  FOR ALL
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- ────────────────────────────────────────────────────────────────────────────────
-- 9. Storage policies for campaign_assets bucket
-- ────────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can upload campaign assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update campaign assets" ON storage.objects;

CREATE POLICY "Admins can upload campaign assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'campaign_assets'
    AND public.is_active_admin()
  );

CREATE POLICY "Admins can update campaign assets"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'campaign_assets'
    AND public.is_active_admin()
  );
