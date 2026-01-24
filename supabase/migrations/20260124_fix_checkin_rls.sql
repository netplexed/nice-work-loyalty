-- Fix: Add RLS policies for check_ins table
-- Required for simulateCheckIn server action to work

-- 1. Allow users to view their own check-ins
create policy "Users can view own check-ins"
  on public.check_ins for select
  using (auth.uid() = user_id);

-- 2. Allow users to create check-ins
-- Important: Insert policy must match the creating user
create policy "Users can insert own check-ins"
  on public.check_ins for insert
  with check (auth.uid() = user_id);

-- 3. Grant permissions (just in case)
grant all on public.check_ins to authenticated;
