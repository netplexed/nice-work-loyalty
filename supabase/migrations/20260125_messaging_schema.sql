-- Create admin_broadcasts table
create table public.admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  target_criteria jsonb default '{}'::jsonb, -- e.g. { "tier": "vip" }
  sent_count integer default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Create notifications table
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  title text not null,
  body text not null,
  type text default 'broadcast', -- broadcast, system, transactional
  is_read boolean default false,
  broadcast_id uuid references public.admin_broadcasts(id),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.admin_broadcasts enable row level security;
alter table public.notifications enable row level security;

-- Policies for admin_broadcasts
create policy "Admins can manage broadcasts"
  on public.admin_broadcasts
  for all
  using (
    exists (
      select 1 from public.admin_users
      where admin_users.id = auth.uid()
      and admin_users.active = true
    )
  );

-- Policies for notifications
create policy "Users can view own notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications (mark read)"
  on public.notifications
  for update
  using (auth.uid() = user_id);

-- Admins can insert notifications (for broadcasting)
create policy "Admins can insert notifications"
  on public.notifications
  for insert
  with check (
    exists (
      select 1 from public.admin_users
      where admin_users.id = auth.uid()
      and admin_users.active = true
    )
  );

-- Indexes
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_is_read on public.notifications(user_id, is_read);
