create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  endpoint text unique not null,
  keys jsonb not null, -- contains { auth, p256dh }
  user_agent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users can manage own subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id);

create index idx_push_subs_user on public.push_subscriptions(user_id);
