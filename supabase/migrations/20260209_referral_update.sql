
alter table public.referral_redemptions 
add column if not exists referrer_rewarded boolean default false;

-- Backfill existing records as true since they were already rewarded
update public.referral_redemptions 
set referrer_rewarded = true 
where referrer_rewarded is false;
