-- Migration: Remove Visit Bonus Awards
-- Description:
-- 1) Ensure check_ins default points_awarded is 0
-- 2) Keep visit recording as activity only (no automatic points from check_ins rows)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'check_ins'
      AND column_name = 'points_awarded'
  ) THEN
    ALTER TABLE public.check_ins
      ALTER COLUMN points_awarded SET DEFAULT 0;
  END IF;
END $$;

