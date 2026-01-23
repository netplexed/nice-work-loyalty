-- Allow users to read their own admin status
-- This is required for the `verifyAdmin` function to work

CREATE POLICY "Users can view own admin status"
  ON public.admin_users FOR SELECT
  USING (auth.uid() = id);

-- Also allow admins to view ALL admin users (for management later)
CREATE POLICY "Admins can view all admin users"
  ON public.admin_users FOR SELECT
  USING (
    exists (
      select 1 from public.admin_users 
      where id = auth.uid() and active = true
    )
  );
