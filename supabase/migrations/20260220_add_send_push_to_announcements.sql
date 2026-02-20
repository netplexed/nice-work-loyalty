-- Add send_push column to announcements

ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS send_push boolean DEFAULT true;

-- Backfill existing rows to true (if needed)
UPDATE public.announcements SET send_push = true WHERE send_push IS NULL;
