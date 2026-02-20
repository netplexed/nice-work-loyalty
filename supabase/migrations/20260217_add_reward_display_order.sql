-- Add manual display ordering for rewards catalog
alter table public.rewards
add column if not exists display_order integer not null default 0;

create index if not exists idx_rewards_display_order
on public.rewards(display_order, created_at desc);

-- Backfill existing records with current catalog order if still defaulted.
with ranked as (
  select
    id,
    row_number() over (order by points_cost asc, created_at desc) as rn
  from public.rewards
)
update public.rewards r
set display_order = ranked.rn
from ranked
where r.id = ranked.id
  and coalesce(r.display_order, 0) = 0;
