-- MANUAL UPDATE V2: Lottery Features
-- Run this in Supabase SQL Editor to add support for:
-- 1. Reward-based prizes (not just NICE points)
-- 2. Flexible Auto-Entry rules

-- Add columns for Reward Prizes
alter table public.lottery_drawings
add column if not exists prize_type text check (prize_type in ('nice', 'reward')) default 'nice',
add column if not exists reward_id uuid references public.rewards(id);

create index if not exists idx_lottery_drawings_reward on public.lottery_drawings(reward_id);

-- Add column for Auto-Entry Config
alter table public.lottery_drawings
add column if not exists auto_entry_config jsonb;

-- Comment:
-- prize_type: 'nice' or 'reward'
-- reward_id: Link to the reward if prize_type is 'reward'
-- auto_entry_config: JSON rules like { "type": "recent_visit", "days": 30, "quantity": 1 }
