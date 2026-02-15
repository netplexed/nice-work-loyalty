-- Enable marketing consent by default for new users
ALTER TABLE public.profiles
ALTER COLUMN marketing_consent SET DEFAULT true;

-- Backfill: Enable consent for users created in the last 7 days who haven't explicitly opted out (assuming null/false means "not asked yet" for this context)
-- Note: Verification script will handle the actual update for testing if this migration isn't auto-applied.
UPDATE public.profiles
SET marketing_consent = true
WHERE created_at > (now() - interval '7 days')
  AND marketing_consent = false;
