-- Add optional expiration date to rewards
-- This allows admins to set a date after which a reward is automatically hidden from the catalog

alter table public.rewards
add column if not exists expires_at timestamptz;

create index if not exists idx_rewards_expires_at on public.rewards(expires_at);

-- Comment:
-- expires_at: Optional timestamp when the reward expires and should be hidden from the catalog
-- If NULL, the reward never expires
