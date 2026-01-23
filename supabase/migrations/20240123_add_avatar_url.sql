-- 1. Add the missing avatar_url column
alter table public.profiles 
add column if not exists avatar_url text default null;

-- 2. Allow phone to be optional (nullable)
alter table public.profiles 
alter column phone drop not null;

-- 3. Ensure users can update their own profile (update existing policy if needed)
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
