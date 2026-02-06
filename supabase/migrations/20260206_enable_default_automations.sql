-- Enable default automations for testing/onboarding
UPDATE public.automations
SET active = true
WHERE type IN ('welcome', 'birthday', 'win_back');
