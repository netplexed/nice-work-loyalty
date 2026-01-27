-- Marketing Workflows (The Definitions)
create table public.marketing_workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  trigger_type text not null check (trigger_type in ('event', 'schedule')),
  trigger_config jsonb default '{}'::jsonb, 
  -- Event Config: { "event": "order.completed", "filters": { "min_value": 50 } }
  -- Schedule Config: { "cron": "0 9 * * 1" }
  steps jsonb default '[]'::jsonb, 
  -- Array of steps: [ { "id": "1", "type": "delay", "config": { "hours": 24 } }, ... ]
  active boolean default false,
  created_by uuid references public.profiles,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workflow Enrollments ( The Instances / State Machine)
create table public.workflow_enrollments (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.marketing_workflows(id),
  user_id uuid references public.profiles(id),
  current_step_index integer default 0,
  status text default 'active' check (status in ('active', 'completed', 'cancelled', 'failed')),
  next_execution_at timestamptz default now(), -- When to run the next step (or current step if pending)
  context jsonb default '{}'::jsonb, -- Store trigger data (e.g. order_id)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.marketing_workflows enable row level security;
alter table public.workflow_enrollments enable row level security;

-- Policies for Admins
create policy "Admins can manage workflows"
  on public.marketing_workflows for all
  using ( exists ( select 1 from public.admin_users where id = auth.uid() and active = true ) );

create policy "Admins can view enrollments"
  on public.workflow_enrollments for select
  using ( exists ( select 1 from public.admin_users where id = auth.uid() and active = true ) );

-- Service Role / Server Actions will manage enrollments (insert/update).
-- We can add a policy for the system if needed, but usually RLS is bypassed or we use service role given Supabase helper context.
-- For now, let's allow admins to fully manage enrollments for debugging.
create policy "Admins can manage enrollments"
  on public.workflow_enrollments for all
  using ( exists ( select 1 from public.admin_users where id = auth.uid() and active = true ) );
