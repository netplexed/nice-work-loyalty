-- Create table to track WHO used WHICH code
-- The existing 'referrals' table defines the code for a referrer.
-- This table tracks the actual usage/redemption.

create table public.referral_redemptions (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references public.profiles not null,
  referee_id uuid references public.profiles not null,
  code_used varchar(20) not null,
  points_awarded integer default 500,
  created_at timestamptz default now(),
  
  -- Ensure a user can only be referred once
  constraint unique_referee unique (referee_id)
);

-- RLS
alter table public.referral_redemptions enable row level security;

-- Users can view redemptions where they are involved
create policy "Users can view own redemptions"
  on public.referral_redemptions for select
  using (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- Users can insert their own redemption (as referee)
create policy "Users can insert redemption"
  on public.referral_redemptions for insert
  with check (auth.uid() = referee_id);

-- Grant perms
grant all on public.referral_redemptions to authenticated;
grant all on public.referral_redemptions to service_role;
