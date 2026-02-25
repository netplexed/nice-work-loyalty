-- Admin & Staff Management schema upgrade.
-- This migration keeps the legacy "active" column for compatibility, while
-- introducing role/status/invite metadata required by the admin management UI.

DO $$
BEGIN
  CREATE TYPE public.admin_role AS ENUM ('super_admin', 'manager', 'staff');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.admin_status AS ENUM ('active', 'pending', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Normalize any legacy role values before converting to enum.
UPDATE public.admin_users
SET role = CASE
  WHEN role IN ('super_admin', 'manager', 'staff') THEN role
  WHEN role = 'admin' THEN 'manager'
  ELSE 'staff'
END
WHERE role IS DISTINCT FROM CASE
  WHEN role IN ('super_admin', 'manager', 'staff') THEN role
  WHEN role = 'admin' THEN 'manager'
  ELSE 'staff'
END;

ALTER TABLE public.admin_users
  ALTER COLUMN role TYPE public.admin_role
  USING role::text::public.admin_role;

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS status public.admin_status,
  ADD COLUMN IF NOT EXISTS invited_by uuid,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.admin_users
  DROP CONSTRAINT IF EXISTS admin_users_id_fkey;

ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE public.admin_users
  DROP CONSTRAINT IF EXISTS admin_users_invited_by_fkey;

ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_invited_by_fkey
  FOREIGN KEY (invited_by)
  REFERENCES public.admin_users(id);

UPDATE public.admin_users au
SET
  email = COALESCE(
    au.email,
    (SELECT p.email FROM public.profiles p WHERE p.id = au.id),
    (SELECT u.email FROM auth.users u WHERE u.id = au.id),
    au.id::text || '@pending.local'
  ),
  full_name = COALESCE(
    NULLIF(au.full_name, ''),
    NULLIF((SELECT p.full_name FROM public.profiles p WHERE p.id = au.id), ''),
    NULLIF((SELECT u.raw_user_meta_data ->> 'full_name' FROM auth.users u WHERE u.id = au.id), ''),
    split_part(
      COALESCE(
        (SELECT p.email FROM public.profiles p WHERE p.id = au.id),
        (SELECT u.email FROM auth.users u WHERE u.id = au.id),
        au.id::text
      ),
      '@',
      1
    )
  ),
  status = COALESCE(
    au.status,
    CASE WHEN COALESCE(au.active, true) THEN 'active'::public.admin_status ELSE 'disabled'::public.admin_status END
  ),
  invited_at = COALESCE(au.invited_at, au.created_at, now()),
  updated_at = COALESCE(au.updated_at, au.created_at, now());

ALTER TABLE public.admin_users
  ALTER COLUMN role SET DEFAULT 'staff',
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN full_name SET NOT NULL,
  ALTER COLUMN invited_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email_unique
  ON public.admin_users (email);

CREATE INDEX IF NOT EXISTS idx_admin_users_status_role
  ON public.admin_users (status, role);

CREATE OR REPLACE FUNCTION public.admin_users_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NULL AND NEW.active IS NULL THEN
      NEW.status := 'pending'::public.admin_status;
      NEW.active := false;
    ELSIF NEW.status IS NULL THEN
      NEW.status := CASE
        WHEN COALESCE(NEW.active, false) THEN 'active'::public.admin_status
        ELSE 'disabled'::public.admin_status
      END;
    ELSIF NEW.active IS NULL THEN
      NEW.active := (NEW.status = 'active');
    END IF;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.active := (NEW.status = 'active');
    ELSIF NEW.active IS DISTINCT FROM OLD.active THEN
      NEW.status := CASE
        WHEN NEW.active THEN 'active'::public.admin_status
        ELSE 'disabled'::public.admin_status
      END;
    ELSE
      NEW.active := (NEW.status = 'active');
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_users_before_write ON public.admin_users;
CREATE TRIGGER admin_users_before_write
BEFORE INSERT OR UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.admin_users_before_write();

UPDATE public.admin_users
SET active = (status = 'active');

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_users', policy_record.policyname);
  END LOOP;
END $$;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "self_read"
ON public.admin_users
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "super_admin_read_all"
ON public.admin_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users actor
    WHERE actor.id = auth.uid()
      AND actor.role = 'super_admin'
      AND actor.status = 'active'
  )
);

CREATE POLICY "super_admin_write"
ON public.admin_users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users actor
    WHERE actor.id = auth.uid()
      AND actor.role = 'super_admin'
      AND actor.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users actor
    WHERE actor.id = auth.uid()
      AND actor.role = 'super_admin'
      AND actor.status = 'active'
  )
);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  actor_admin_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  previous_value text,
  new_value text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
  ON public.admin_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user
  ON public.admin_audit_log (admin_user_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_read_audit_log" ON public.admin_audit_log;
CREATE POLICY "super_admin_read_audit_log"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users actor
    WHERE actor.id = auth.uid()
      AND actor.role = 'super_admin'
      AND actor.status = 'active'
  )
);

DROP POLICY IF EXISTS "active_admin_insert_audit_log" ON public.admin_audit_log;
CREATE POLICY "active_admin_insert_audit_log"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users actor
    WHERE actor.id = auth.uid()
      AND actor.status = 'active'
  )
);
