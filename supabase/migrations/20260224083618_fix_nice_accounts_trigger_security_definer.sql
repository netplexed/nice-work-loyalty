-- Add SECURITY DEFINER to the signup trigger so it can bypass RLS on nice_accounts
CREATE OR REPLACE FUNCTION public.create_nice_account_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a nice account with 0 collected balance, but backdate the tank_last_collected_at by 11.9945 hours.
  -- Since base_rate is 2.0 / hour, this equals exactly 23.989 Nice in the generator.
  INSERT INTO public.nice_accounts (user_id, nice_collected_balance, tank_last_collected_at)
  VALUES (NEW.id, 0, now() - interval '11 hours 59 minutes 40 seconds');
  RETURN NEW;
END;
$$;
