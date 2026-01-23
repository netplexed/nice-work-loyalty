-- Seed Admin User
-- Replace 'auth.uid()' with the actual UUID if creating manually, 
-- but since we are running this in SQL Editor where we are usually the admin,
-- we can't easily guess the ID.
-- STRATEGY: Make the most recently created user an admin (usually the developer).

INSERT INTO public.admin_users (id, role, locations, active)
SELECT id, 'super_admin', ARRAY['all'], true
FROM public.profiles
ORDER BY created_at DESC
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- If you want to force a specific email (better for reliability):
-- INSERT INTO public.admin_users (id, role, locations, active)
-- SELECT id, 'super_admin', ARRAY['all'], true
-- FROM public.profiles 
-- WHERE email = 'YOUR_EMAIL_HERE'
-- ON CONFLICT (id) DO NOTHING;
