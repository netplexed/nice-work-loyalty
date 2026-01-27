-- Migration: Remove Salmon Samurai
-- Description: Migrates existing data to 'standing_sushi_bar' and bans 'salmon_samurai' from future inserts.

BEGIN;

-- 1. Data Migration
-- Update existing purchases to point to an active location
UPDATE public.purchases
SET location = 'standing_sushi_bar'
WHERE location = 'salmon_samurai';

-- 2. Schema Constraint Update
-- We need to drop the old check constraint and add a new one.
-- constraint name is usually formatted like "purchases_location_check"
-- We will drop it if it exists.

ALTER TABLE public.purchases
DROP CONSTRAINT IF EXISTS purchases_location_check;

ALTER TABLE public.purchases
ADD CONSTRAINT purchases_location_check
CHECK (location IN ('tanuki_raw', 'standing_sushi_bar'));

-- Verify no salmon_samurai remains (should be 0)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.purchases WHERE location = 'salmon_samurai') THEN
        RAISE EXCEPTION 'Migration failed: salmon_samurai records still exist';
    END IF;
END $$;

COMMIT;
