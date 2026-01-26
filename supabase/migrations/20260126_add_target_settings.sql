-- Add target_settings to email_campaigns for storing complex segmentation data
alter table public.email_campaigns 
add column target_settings jsonb default '{}'::jsonb;

-- Also ensure admin_broadcasts has it (it already has target_criteria jsonb in 20260125_messaging_schema.sql)
