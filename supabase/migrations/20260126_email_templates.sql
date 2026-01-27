-- Create email templates table
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null, -- Internal name
  description text,
  subject text, -- Default subject
  content_html text,
  design_json jsonb, -- For editor state
  created_by uuid references public.profiles,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.email_templates enable row level security;

-- Policies for Admins
create policy "Admins can manage email templates"
  on public.email_templates for all
  using (
    exists (
      select 1 from public.admin_users 
      where id = auth.uid() and active = true
    )
  );
