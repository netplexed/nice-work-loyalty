-- Migration: Lottery Rewards Support
-- Description: Adds columns to associate lottery drawings with specific rewards

alter table public.lottery_drawings
add column if not exists prize_type text check (prize_type in ('nice', 'reward')) default 'nice',
add column if not exists reward_id uuid references public.rewards(id);

create index if not exists idx_lottery_drawings_reward on public.lottery_drawings(reward_id);
