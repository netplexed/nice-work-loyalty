-- Make phone number optional for Email Auth support
ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;

-- Also drop separate unique index if exists (though the unique constraint might be on the column itself)
-- If 'phone' was defined as 'unique not null', we might want to keep it unique *if not null*
-- Postgres handles unique nulls correctly (multiple rows can be null), so keeping unique is fine.
