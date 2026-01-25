-- Promote the most recently active user to Admin
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the most recently created user from profiles (or check_ins/spins)
  -- profiles is safest
  SELECT id INTO v_user_id FROM public.profiles ORDER BY created_at DESC LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.admin_users (id, role, active)
    VALUES (v_user_id, 'super_admin', true)
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin', active = true;
    
    RAISE NOTICE 'Promoted User % to Super Admin', v_user_id;
  ELSE
    RAISE NOTICE 'No users found to promote.';
  END IF;
END;
$$;
