-- Migration: Nice Currency System
-- Description: Adds tables and functions for the "Nice" engagement currency system

-- 1. Nice Accounts Table
-- Stores the user's nice balance and generation parameters
create table public.nice_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null unique,
  
  -- Main balance (static until collection)
  nice_collected_balance integer default 0,
  
  -- Tank generation tracking
  tank_last_collected_at timestamptz default now(),
  tank_capacity integer default 48,
  
  -- Generation rate components
  base_rate decimal(5,2) default 2.0, -- Always 2.0 nice/hour base
  current_multiplier decimal(4,2) default 1.0,
  multiplier_expires_at timestamptz,
  tier_bonus decimal(3,2) default 1.0, -- Bronze=1.0, Silver=1.5, Gold=2.0, Platinum=2.5
  
  -- Lifetime stats
  total_nice_earned bigint default 0,
  total_nice_spent bigint default 0,
  total_collections integer default 0,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.nice_accounts enable row level security;
create index idx_nice_accounts_user on public.nice_accounts(user_id);

-- 2. Nice Transactions Table
-- Ledger of all Nice movements
create table public.nice_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  transaction_type varchar(50) not null check (
    transaction_type in (
      'generated', 'collected', 'visit_bonus', 'converted_to_points',
      'gifted_sent', 'gifted_received', 'auction_bid', 'auction_refund',
      'raffle_ticket', 'donation', 'store_purchase', 'flash_sale',
      'expired', 'adjusted'
    )
  ),
  nice_amount integer not null,
  reference_id uuid, -- Optional link to other tables (e.g., purchase_id)
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.nice_transactions enable row level security;
create index idx_nice_trans_user on public.nice_transactions(user_id, created_at desc);
create index idx_nice_trans_type on public.nice_transactions(transaction_type);

-- 3. Visit Multipliers History
-- Tracks when multipliers were awarded
create table public.visit_multipliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  multiplier decimal(4,2) not null,
  reason varchar(100),
  activated_at timestamptz default now(),
  expires_at timestamptz not null,
  active boolean default true
);

alter table public.visit_multipliers enable row level security;
create index idx_visit_mult_user on public.visit_multipliers(user_id, expires_at desc);

-- 4. Tank Modifiers
-- Tracks temporary or permanent capacity changes
create table public.tank_modifiers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  modifier_type varchar(50) check (
    modifier_type in ('expansion', 'contraction', 'upgrade')
  ),
  size_change integer not null,
  reason varchar(255),
  starts_at timestamptz default now(),
  expires_at timestamptz, -- null = permanent
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.tank_modifiers enable row level security;
create index idx_tank_mod_user on public.tank_modifiers(user_id, active);

-- 5. Supporting Tables (Auctions, Raffles, Store)
-- Simplified implementation for MPV, more detail can be added later

-- Auctions
create table public.auctions (
  id uuid primary key default gen_random_uuid(),
  title varchar(255) not null,
  description text,
  tier varchar(50) check (tier in ('accessible', 'premium', 'ultra_rare')),
  image_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status varchar(50) default 'upcoming' check (
    status in ('upcoming', 'active', 'ended', 'cancelled')
  ),
  created_at timestamptz default now()
);
alter table public.auctions enable row level security;

-- Auction Bids
create table public.auction_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid references public.auctions(id) not null,
  user_id uuid references public.profiles(id) not null,
  bid_amount integer not null,
  is_winning boolean default false,
  created_at timestamptz default now()
);
alter table public.auction_bids enable row level security;
create index idx_bids_auction on public.auction_bids(auction_id, bid_amount desc);

-- Raffles
create table public.raffles (
  id uuid primary key default gen_random_uuid(),
  title varchar(255) not null,
  prize_description text,
  ticket_cost integer default 100,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  drawing_at timestamptz not null,
  winner_id uuid references public.profiles(id),
  status varchar(50) default 'upcoming' check (
    status in ('upcoming', 'active', 'drawn', 'cancelled')
  ),
  created_at timestamptz default now()
);
alter table public.raffles enable row level security;

-- Raffle Tickets
create table public.raffle_tickets (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid references public.raffles(id) not null,
  user_id uuid references public.profiles(id) not null,
  ticket_count integer not null,
  nice_spent integer not null,
  created_at timestamptz default now()
);
alter table public.raffle_tickets enable row level security;

-- Nice Store Items (Boosts, etc.)
create table public.nice_store_items (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  description text,
  nice_cost integer not null,
  item_type varchar(50) check (
    item_type in ('multiplier_boost', 'tank_expansion', 'freeze_multiplier')
  ),
  effect_value decimal(5,2),
  duration_hours integer,
  active boolean default true,
  created_at timestamptz default now()
);
alter table public.nice_store_items enable row level security;

-- Nice Store Purchases
create table public.nice_store_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  item_id uuid references public.nice_store_items(id) not null,
  nice_spent integer not null,
  activated_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now()
);
alter table public.nice_store_purchases enable row level security;

-- RLS Policies
-- Profiles can read their own nice account
create policy "Users can view own nice account"
  on public.nice_accounts for select
  using (auth.uid() = user_id);
  
create policy "Users can view own nice transactions"
  on public.nice_transactions for select
  using (auth.uid() = user_id);

-- DATABASE FUNCTIONS

-- Function: Collect Nice
create or replace function collect_nice_transaction(
  p_user_id uuid,
  p_nice_amount integer
)
returns jsonb as $$
declare
  v_new_balance integer;
begin
  -- Update nice account
  update public.nice_accounts
  set 
    nice_collected_balance = nice_collected_balance + p_nice_amount,
    tank_last_collected_at = now(),
    total_nice_earned = total_nice_earned + p_nice_amount,
    total_collections = total_collections + 1,
    updated_at = now()
  where user_id = p_user_id
  returning nice_collected_balance into v_new_balance;
  
  -- Record transaction
  insert into public.nice_transactions (
    user_id,
    transaction_type,
    nice_amount,
    metadata
  ) values (
    p_user_id,
    'collected',
    p_nice_amount,
    jsonb_build_object('collection_timestamp', now(), 'new_balance', v_new_balance)
  );
  
  return jsonb_build_object('new_balance', v_new_balance, 'success', true);
end;
$$ language plpgsql;

-- Function: Award Visit Bonus
create or replace function award_visit_bonus(
  p_user_id uuid,
  p_multiplier decimal(4,2),
  p_expires_at timestamptz,
  p_bonus_nice integer
)
returns jsonb as $$
declare
  v_previous_multiplier decimal(4,2);
  v_new_balance integer;
begin
  select current_multiplier into v_previous_multiplier
  from public.nice_accounts
  where user_id = p_user_id;
  
  -- If no account exists yet (rare edge case on first visit if not seeded), create one? 
  -- Assuming account exists for now or handled by trigger on profile creation.
  
  update public.nice_accounts
  set 
    nice_collected_balance = nice_collected_balance + p_bonus_nice,
    current_multiplier = p_multiplier,
    multiplier_expires_at = p_expires_at,
    total_nice_earned = total_nice_earned + p_bonus_nice,
    updated_at = now()
  where user_id = p_user_id
  returning nice_collected_balance into v_new_balance;
  
  insert into public.nice_transactions (
    user_id, transaction_type, nice_amount, metadata
  ) values (
    p_user_id, 'visit_bonus', p_bonus_nice,
    jsonb_build_object(
      'new_multiplier', p_multiplier,
      'previous_multiplier', v_previous_multiplier,
      'expires_at', p_expires_at
    )
  );
  
  insert into public.visit_multipliers (
    user_id, multiplier, reason, expires_at
  ) values (
    p_user_id, p_multiplier, 'visit_bonus', p_expires_at
  );
  
  return jsonb_build_object(
    'previous_multiplier', v_previous_multiplier,
    'new_balance', v_new_balance,
    'success', true
  );
end;
$$ language plpgsql;

-- Function: Convert Nice to Points
create or replace function convert_nice_to_points(
    p_user_id uuid,
    p_nice_amount integer,
    p_points_amount integer
)
returns jsonb as $$
declare
    v_new_nice_balance integer;
    v_new_points_balance integer;
begin
    -- Deduct nice
    update public.nice_accounts
    set nice_collected_balance = nice_collected_balance - p_nice_amount
    where user_id = p_user_id
    returning nice_collected_balance into v_new_nice_balance;
    
    -- Add points (assuming points_balance is on profiles table)
    update public.profiles
    set points_balance = points_balance + p_points_amount
    where id = p_user_id
    returning points_balance into v_new_points_balance;

    -- Record transaction
    insert into public.nice_transactions (
        user_id, transaction_type, nice_amount, metadata
    ) values (
        p_user_id, 'converted_to_points', -p_nice_amount,
        jsonb_build_object('points_gained', p_points_amount)
    );
    
     -- Record points transaction (assuming points_transactions table exists)
    insert into public.points_transactions (
        user_id, transaction_type, points, description, created_at
    ) values (
        p_user_id, 'earned_bonus', p_points_amount, 'Converted from Nice', now()
    );

    return jsonb_build_object(
        'new_nice_balance', v_new_nice_balance,
        'new_points_balance', v_new_points_balance
    );
end;
$$ language plpgsql;

-- Trigger: Create Nice Account on Profile Creation
create or replace function create_nice_account_on_signup()
returns trigger as $$
begin
  insert into public.nice_accounts (user_id)
  values (NEW.id);
  return NEW;
end;
$$ language plpgsql;

create trigger on_auth_user_created_nice_account
  after insert on public.profiles
  for each row
  execute function create_nice_account_on_signup();

-- Backfill existing users
insert into public.nice_accounts (user_id)
select id from public.profiles
where id not in (select user_id from public.nice_accounts);

