-- DEBUG FUNCTION: Reset Daily Spin
-- Run this to allow testing the spin wheel multiple times per day.

CREATE OR REPLACE FUNCTION debug_reset_daily_spin()
RETURNS void AS $$
BEGIN
  -- Delete all daily spins for the current user created today
  DELETE FROM public.spins
  WHERE user_id = auth.uid()
    AND spin_type = 'daily'
    AND created_at >= current_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
