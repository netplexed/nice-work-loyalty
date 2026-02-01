-- Migration: Weekly Lottery System
-- Description: Adds tables for the lottery system (drawings, entries, winners, stats)

-- 1. Lottery Drawings Table
create table public.lottery_drawings (
  id uuid primary key default gen_random_uuid(),
  draw_date timestamptz not null,
  week_start_date date not null,
  prize_tier text not null check (prize_tier in ('standard', 'monthly', 'quarterly')),
  prize_description text not null,
  prize_value decimal(10,2) not null,
  status text not null check (status in ('upcoming', 'active', 'drawn', 'awarded')) default 'upcoming',
  
  -- Stats
  total_entries integer default 0,
  total_participants integer default 0,
  
  -- Results
  winning_ticket_number integer,
  random_seed text,
  drawn_at timestamptz,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.lottery_drawings enable row level security;

-- Indexes
create index idx_lottery_drawings_status on public.lottery_drawings(status, week_start_date);
create index idx_lottery_drawings_draw_date on public.lottery_drawings(draw_date);


-- 2. Lottery Entries Table
create table public.lottery_entries (
  id uuid primary key default gen_random_uuid(),
  drawing_id uuid references public.lottery_drawings(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  entry_type text not null check (entry_type in ('base', 'purchased', 'visit', 'checkin')),
  
  nice_spent integer, -- NULL for free entries
  quantity integer not null default 1,
  
  visit_id uuid references public.visits(id), -- Optional link to visit
  
  created_at timestamptz default now()
);

alter table public.lottery_entries enable row level security;

-- Indexes
create index idx_lottery_entries_drawing on public.lottery_entries(drawing_id);
create index idx_lottery_entries_user on public.lottery_entries(user_id, drawing_id);
create index idx_lottery_entries_type on public.lottery_entries(drawing_id, entry_type);


-- 3. Lottery Winners Table
create table public.lottery_winners (
  id uuid primary key default gen_random_uuid(),
  drawing_id uuid references public.lottery_drawings(id) not null,
  user_id uuid references public.profiles(id) not null,
  
  prize_rank integer not null default 1,
  prize_description text not null,
  prize_value decimal(10,2) not null,
  
  voucher_code text unique,
  voucher_expiry_date date,
  
  claimed boolean default false,
  claimed_at timestamptz,
  
  notified boolean default false,
  notified_at timestamptz,
  
  created_at timestamptz default now()
);

alter table public.lottery_winners enable row level security;

create index idx_lottery_winners_drawing on public.lottery_winners(drawing_id);
create index idx_lottery_winners_user on public.lottery_winners(user_id);
create index idx_lottery_winners_voucher on public.lottery_winners(voucher_code);


-- 4. Lottery Stats Table (for analytics)
create table public.lottery_stats (
  id uuid primary key default gen_random_uuid(),
  drawing_id uuid references public.lottery_drawings(id) unique not null,
  
  total_participants integer not null,
  total_entries integer not null,
  total_nice_spent integer not null,
  
  avg_entries_per_user decimal(5,2),
  
  entries_purchased integer,
  entries_visit integer,
  entries_checkin integer,
  entries_base integer,
  
  created_at timestamptz default now()
);

alter table public.lottery_stats enable row level security;


-- 5. RLS Policies

-- Public/Authenticated users can view drawings
create policy "Everyone can view drawings"
  on public.lottery_drawings for select
  using (true);

-- Users can view their own entries
create policy "Users can view own entries"
  on public.lottery_entries for select
  using (auth.uid() = user_id);

-- Everyone can view winners (public social proof)
create policy "Everyone can view winners"
  on public.lottery_winners for select
  using (true);

-- Only admins/backend to manage stats usually, but readable is fine
create policy "Everyone can view stats"
  on public.lottery_stats for select
  using (true);


-- 6. Helper: Update Transaction Type Constraint (Safe way)
-- We need to drop the old constraint and add a new one to include lottery types
do $$
begin
  alter table public.nice_transactions 
    drop constraint if exists nice_transactions_transaction_type_check;

  alter table public.nice_transactions 
    add constraint nice_transactions_transaction_type_check 
    check (transaction_type in (
      'generated', 'collected', 'visit_bonus', 'converted_to_points',
      'gifted_sent', 'gifted_received', 'auction_bid', 'auction_refund',
      'raffle_ticket', 'donation', 'store_purchase', 'flash_sale',
      'expired', 'adjusted',
      -- New types
      'lottery_purchase'
    ));
end $$;
