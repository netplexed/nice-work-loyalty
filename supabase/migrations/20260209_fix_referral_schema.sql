
-- 1. Create table if not exists (Idempotent)
create table if not exists public.referral_redemptions (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references public.profiles not null,
  referee_id uuid references public.profiles not null,
  code_used varchar(20) not null,
  points_awarded integer default 500,
  created_at timestamptz default now(),
  constraint unique_referee unique (referee_id)
);

-- 2. Add referrer_rewarded column (Idempotent)
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name = 'referral_redemptions' and column_name = 'referrer_rewarded') then
    alter table public.referral_redemptions add column referrer_rewarded boolean default false;
  end if;
end $$;

-- 3. Backfill existing records (if any were created before this column)
update public.referral_redemptions 
set referrer_rewarded = true 
where referrer_rewarded is null; -- Should be covered by default but good to be safe if manual insert happened

-- 4. Enable RLS (Idempotent)
alter table public.referral_redemptions enable row level security;

-- 5. Create Policies (Idempotent - drop first to avoid errors or use IF NOT EXISTS workaround)
drop policy if exists "Users can view own redemptions" on public.referral_redemptions;
create policy "Users can view own redemptions"
  on public.referral_redemptions for select
  using (auth.uid() = referrer_id OR auth.uid() = referee_id);

drop policy if exists "Users can insert redemption" on public.referral_redemptions;
create policy "Users can insert redemption"
  on public.referral_redemptions for insert
  with check (auth.uid() = referee_id);

-- 6. Grant perms
grant all on public.referral_redemptions to authenticated;
grant all on public.referral_redemptions to service_role;
