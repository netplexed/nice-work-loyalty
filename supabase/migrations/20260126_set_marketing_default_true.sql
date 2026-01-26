-- Migration: Set Marketing Consent Default to True
-- Description: Changes default value for marketing_consent to true for new users.

ALTER TABLE public.profiles 
ALTER COLUMN marketing_consent SET DEFAULT true;

-- Optional: If you want to opt-in existing users who haven't explicitly opted out (risky if you don't track explicit opt-out vs default):
-- UPDATE public.profiles SET marketing_consent = true WHERE marketing_consent = false;
-- We will NOT do the update automatically to respect potential existing choices, 
-- but we will ensure new users are opted in.
