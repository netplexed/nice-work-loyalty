-- Create email campaigns table
create table public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  title varchar(255) not null,
  subject varchar(255) not null,
  html_content text,
  json_content jsonb, -- For Tiptap state if needed
  status varchar(50) default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  sent_count integer default 0,
  recipient_count integer default 0,
  target_audience varchar(50) default 'all', -- 'all', 'vip', etc.
  created_by uuid references public.profiles,
  created_at timestamptz default now(),
  sent_at timestamptz
);

-- Enable RLS
alter table public.email_campaigns enable row level security;

-- Policies for Admins
create policy "Admins can manage campaigns"
  on public.email_campaigns for all
  using (
    exists (
      select 1 from public.admin_users 
      where id = auth.uid() and active = true
    )
  );

-- STORAGE SETUP for images
-- Note: You might need to manually create the bucket 'campaign_assets' in dashboard if this fails on local vs cloud differences, 
-- but standards suggest inserting into storage.buckets if using local Supabase, or just Policies if bucket exists.
-- We will assume the bucket needs to be created or we just set policies.

insert into storage.buckets (id, name, public)
values ('campaign_assets', 'campaign_assets', true)
on conflict (id) do nothing;

-- Storage Policies
create policy "Admins can upload campaign assets"
  on storage.objects for insert
  with check (
    bucket_id = 'campaign_assets' and
    exists (
      select 1 from public.admin_users 
      where id = auth.uid() and active = true
    )
  );

create policy "Admins can update campaign assets"
  on storage.objects for update
  using (
    bucket_id = 'campaign_assets' and
    exists (
      select 1 from public.admin_users 
      where id = auth.uid() and active = true
    )
  );

create policy "Public can view campaign assets"
  on storage.objects for select
  using ( bucket_id = 'campaign_assets' );
