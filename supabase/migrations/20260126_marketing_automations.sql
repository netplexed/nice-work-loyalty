-- Automations Table
create table public.automations (
  id uuid primary key default gen_random_uuid(),
  type varchar(50) not null check (type in ('welcome', 'birthday', 'win_back')), 
  name varchar(255) not null,
  trigger_settings jsonb default '{}'::jsonb, -- e.g. { "days_since_last_visit": 30 }
  email_subject varchar(255) not null,
  email_body text,
  reward_id uuid references public.rewards(id),
  active boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Automation Execution Logs
-- Tracks which users have received which automation to prevent spam
create table public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid references public.automations(id) not null,
  user_id uuid references public.profiles(id) not null,
  executed_at timestamptz default now()
);

-- RLS
alter table public.automations enable row level security;
alter table public.automation_logs enable row level security;

-- Policies (Admins only for management)
create policy "Admins can manage automations"
  on public.automations for all
  using (
    exists (
      select 1 from public.admin_users 
      where id = auth.uid() and active = true
    )
  );

create policy "Admins can view logs"
  on public.automation_logs for select
  using (
    exists (
      select 1 from public.admin_users 
      where id = auth.uid() and active = true
    )
  );
  
-- Allow service role (API) to insert logs
-- Logs are inserted by server actions usually, but policies apply to client/auth user. 
-- We'll assume admin/service role runs execution. Can add generic insert policy if needed.

-- Seed default automations (Inactive)
insert into public.automations (type, name, email_subject, email_body, trigger_settings)
values 
('welcome', 'Welcome Email', 'Welcome to Nice Work!', '<h1>Welcome!</h1><p>Thanks for joining us.</p>', '{}'),
('birthday', 'Birthday Greeting', 'Happy Birthday!', '<h1>Happy Birthday!</h1><p>Here is a treat for you.</p>', '{}'),
('win_back', 'We Miss You', 'It has been a while...', '<h1>Come back!</h1><p>We miss you.</p>', '{"days_inactive": 30}');
