-- Migration to switch from Phone Auth to Email Auth
-- Make phone optional, email required and unique

ALTER TABLE public.profiles
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN email SET NOT NULL;

-- Ensure email is unique if it wasn't already (though it likely wasn't enforced strictly)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
  END IF;
END $$;
