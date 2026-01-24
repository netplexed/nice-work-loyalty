-- Comprehensive Fix for Check-Ins Permissions

-- 1. Ensure the table exists (This should be true, but just in case)
CREATE TABLE IF NOT EXISTS public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  location varchar(100) not null,
  points_awarded integer default 15,
  created_at timestamptz default now()
);

-- 2. Enable RLS
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid "policy already exists" errors
DROP POLICY IF EXISTS "Users can view own check-ins" ON public.check_ins;
DROP POLICY IF EXISTS "Users can insert own check-ins" ON public.check_ins;

-- 4. Re-create Policies
CREATE POLICY "Users can view own check-ins"
  ON public.check_ins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own check-ins"
  ON public.check_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Grant Permissions
GRANT ALL ON public.check_ins TO authenticated;
GRANT ALL ON public.check_ins TO service_role;
