-- Enable RLS on all tables (will be done per table)

-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users primary key,
  phone varchar(20) unique not null,
  email varchar(255),
  full_name varchar(255),
  birthday date,
  dietary_preferences text[],
  marketing_consent boolean default false,
  push_consent boolean default false,
  tier varchar(20) default 'bronze' check (tier in ('bronze', 'silver', 'gold', 'platinum')),
  total_visits integer default 0,
  total_spent decimal(10,2) default 0,
  points_balance integer default 0,
  current_streak integer default 0,
  last_visit_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Points transactions
create table public.points_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  transaction_type varchar(50) not null check (
    transaction_type in (
      'earned_purchase', 'earned_bonus', 'earned_referral', 
      'earned_social', 'earned_spin', 'redeemed', 'voided', 
      'expired', 'adjusted'
    )
  ),
  points integer not null,
  multiplier decimal(3,2) default 1.0,
  description text,
  reference_id uuid, -- links to purchase, reward, etc.
  metadata jsonb,
  location varchar(100),
  staff_id uuid references public.profiles,
  voided boolean default false,
  void_reason text,
  created_at timestamptz default now()
);

alter table public.points_transactions enable row level security;

create index idx_points_user_created on public.points_transactions(user_id, created_at desc);
create index idx_points_type on public.points_transactions(transaction_type);

-- Purchases (tracks restaurant transactions)
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  location varchar(100) not null check (
    location in ('tanuki_raw', 'standing_sushi_bar', 'salmon_samurai')
  ),
  amount decimal(10,2) not null,
  points_earned integer not null,
  multiplier_applied decimal(3,2) default 1.0,
  payment_method varchar(50),
  receipt_number varchar(100),
  staff_id uuid references public.profiles,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.purchases enable row level security;

create index idx_purchases_user on public.purchases(user_id, created_at desc);

-- Rewards catalog
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  description text,
  points_cost integer not null,
  reward_type varchar(50) not null check (
    reward_type in ('food', 'drink', 'experience', 'voucher', 'merchandise')
  ),
  actual_cost decimal(10,2), -- your cost to fulfill
  perceived_value decimal(10,2), -- customer perception
  category varchar(100),
  locations text[], -- which brands can redeem
  inventory_limit integer,
  inventory_remaining integer,
  image_url text,
  active boolean default true,
  blackout_dates date[],
  tier_required varchar(20) default 'bronze',
  expires_days integer default 30, -- days until reward voucher expires
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.rewards enable row level security;

-- Reward redemptions
create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  reward_id uuid references public.rewards not null,
  points_spent integer not null,
  status varchar(50) default 'pending' check (
    status in ('pending', 'approved', 'redeemed', 'expired', 'cancelled')
  ),
  voucher_code varchar(50) unique,
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_location varchar(100),
  redeemed_by_staff uuid references public.profiles,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.redemptions enable row level security;

create index idx_redemptions_user on public.redemptions(user_id, created_at desc);
create index idx_redemptions_status on public.redemptions(status);

-- Spin wheel spins
create table public.spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  spin_type varchar(50) default 'daily' check (
    spin_type in ('daily', 'bonus', 'birthday', 'event')
  ),
  prize_type varchar(50) not null,
  prize_value integer, -- points if applicable
  prize_description text,
  claimed boolean default true,
  created_at timestamptz default now()
);

alter table public.spins enable row level security;

create index idx_spins_user_date on public.spins(user_id, created_at desc);

-- Referrals
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references public.profiles not null,
  referee_id uuid references public.profiles,
  referee_phone varchar(20),
  referral_code varchar(20) unique not null,
  status varchar(50) default 'pending' check (
    status in ('pending', 'signed_up', 'first_purchase', 'completed')
  ),
  points_awarded integer default 0,
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.referrals enable row level security;

create index idx_referrals_referrer on public.referrals(referrer_id);
create unique index idx_referrals_code on public.referrals(referral_code);

-- Admin users (staff with elevated permissions)
create table public.admin_users (
  id uuid references public.profiles primary key,
  role varchar(50) not null check (
    role in ('super_admin', 'manager', 'staff')
  ),
  locations text[], -- which locations they can manage
  permissions jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.admin_users enable row level security;

-- Audit log
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles,
  admin_id uuid references public.profiles,
  action varchar(100) not null,
  table_name varchar(100),
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

alter table public.audit_log enable row level security;

create index idx_audit_created on public.audit_log(created_at desc);
create index idx_audit_user on public.audit_log(user_id);
create index idx_audit_admin on public.audit_log(admin_id);

-- Campaigns (for promotional periods)
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  description text,
  campaign_type varchar(50) check (
    campaign_type in ('multiplier', 'bonus_points', 'flash_deal', 'event')
  ),
  start_date timestamptz not null,
  end_date timestamptz not null,
  multiplier decimal(3,2),
  bonus_points integer,
  locations text[],
  target_tiers text[],
  conditions jsonb, -- complex rules
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.campaigns enable row level security;

-- User check-ins (for visit tracking)
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  location varchar(100) not null,
  points_awarded integer default 15,
  created_at timestamptz default now()
);

alter table public.check_ins enable row level security;

create index idx_checkins_user on public.check_ins(user_id, created_at desc);

-- RLS POLICIES

-- Profiles: Users can read/update their own, admins can read all
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.admin_users 
      where id = auth.uid() and active = true
    )
  );

-- Points transactions: Users can view their own, admins can view/insert
create policy "Users can view own transactions"
  on public.points_transactions for select
  using (auth.uid() = user_id);

create policy "Admins can view all transactions"
  on public.points_transactions for select
  using (
    exists (
      select 1 from public.admin_users 
      where id = auth.uid() and active = true
    )
  );

create policy "Admins can insert transactions"
  on public.points_transactions for insert
  with check (
    exists (
      select 1 from public.admin_users 
      where id = auth.uid() and active = true
    )
  );

-- Rewards: Everyone can read active rewards
create policy "Anyone can view active rewards"
  on public.rewards for select
  using (active = true);

create policy "Admins can manage rewards"
  on public.rewards for all
  using (
    exists (
      select 1 from public.admin_users 
      where id = auth.uid() and active = true
    )
  );

-- Redemptions: Users can view/create their own
create policy "Users can view own redemptions"
  on public.redemptions for select
  using (auth.uid() = user_id);

create policy "Users can create redemptions"
  on public.redemptions for insert
  with check (auth.uid() = user_id);

create policy "Admins can manage all redemptions"
  on public.redemptions for all
  using (
    exists (
      select 1 from public.admin_users 
      where id = auth.uid() and active = true
    )
  );
  
-- Spins: Users can view their own
create policy "Users can view own spins"
  on public.spins for select
  using (auth.uid() = user_id);
  
create policy "Users can insert spins"
  on public.spins for insert
  with check (auth.uid() = user_id);

-- DATABASE FUNCTIONS

-- Function to calculate tier based on activity
create or replace function calculate_tier(
  p_total_visits integer,
  p_total_spent decimal
) returns varchar as $$
begin
  if p_total_visits >= 150 or p_total_spent >= 12000 then
    return 'platinum';
  elsif p_total_visits >= 80 or p_total_spent >= 5000 then
    return 'gold';
  elsif p_total_visits >= 30 or p_total_spent >= 1500 then
    return 'silver';
  else
    return 'bronze';
  end if;
end;
$$ language plpgsql;

-- Function to check daily spin eligibility
create or replace function can_spin_today(p_user_id uuid)
returns boolean as $$
declare
  last_spin timestamptz;
begin
  select max(created_at) into last_spin
  from public.spins
  where user_id = p_user_id
    and spin_type = 'daily'
    and created_at > current_date;
  
  return last_spin is null;
end;
$$ language plpgsql;

-- Trigger to update user stats after purchase
create or replace function update_user_stats_after_purchase()
returns trigger as $$
begin
  update public.profiles
  set 
    total_visits = total_visits + 1,
    total_spent = total_spent + NEW.amount,
    last_visit_date = current_date,
    tier = calculate_tier(total_visits + 1, total_spent + NEW.amount),
    updated_at = now()
  where id = NEW.user_id;
  
  return NEW;
end;
$$ language plpgsql;

create trigger after_purchase_insert
  after insert on public.purchases
  for each row
  execute function update_user_stats_after_purchase();

-- Trigger to update points balance
create or replace function update_points_balance()
returns trigger as $$
begin
  if TG_OP = 'INSERT' and not NEW.voided then
    update public.profiles
    set points_balance = points_balance + NEW.points
    where id = NEW.user_id;
  elsif TG_OP = 'UPDATE' and NEW.voided and not OLD.voided then
    update public.profiles
    set points_balance = points_balance - OLD.points
    where id = NEW.user_id;
  end if;
  
  return NEW;
end;
$$ language plpgsql;

create trigger after_points_transaction
  after insert or update on public.points_transactions
  for each row
  execute function update_points_balance();
