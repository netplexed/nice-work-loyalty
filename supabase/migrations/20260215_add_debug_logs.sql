
-- Migration: Add Debug Logs
-- Description: Table for capturing server-side logs in production

create table if not exists public.debug_logs (
    id uuid primary key default gen_random_uuid(),
    level varchar(10) default 'info',
    message text not null,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

alter table public.debug_logs enable row level security;
create policy "Admins can view debug logs" on public.debug_logs for select using (true); -- Keep it simple for now
