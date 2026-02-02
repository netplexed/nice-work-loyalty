-- Migration: Lottery Auto Entry Config
-- Description: Adds configuration for automatic entry distribution

alter table public.lottery_drawings
add column if not exists auto_entry_config jsonb;

-- Example config:
-- { "type": "all", "quantity": 1 }
-- { "type": "recent_visit", "days": 60, "quantity": 1 }
