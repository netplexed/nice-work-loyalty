-- Function: Admin Adjust Nice
-- Allows admins to manually increase or decrease a user's nice balance
CREATE OR REPLACE FUNCTION admin_adjust_nice(
  p_user_id uuid,
  p_amount integer,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as superuser/owner to bypass RLS
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  -- Verify admin? 
  -- Ideally we verify the caller is an admin here, but RLS on the RPC itself or the calling context usually handles it.
  -- Since we use `SECURITY DEFINER`, we rely on `GRANT EXECUTE` to restrict access.
  -- However, Supabase calls from the API are usually 'authenticated'. 
  -- We should verify the user is in admin_users table for extra safety inside the function.
  
  IF NOT EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND active = true
  ) THEN
      RAISE EXCEPTION 'Unauthorized: Caller is not an active admin';
  END IF;

  -- Update nice account
  UPDATE public.nice_accounts
  SET 
    nice_collected_balance = nice_collected_balance + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING nice_collected_balance INTO v_new_balance;
  
  -- Record transaction
  INSERT INTO public.nice_transactions (
    user_id,
    transaction_type,
    nice_amount,
    metadata
  ) VALUES (
    p_user_id,
    'adjusted',
    p_amount,
    jsonb_build_object(
        'reason', p_reason, 
        'adjusted_by', auth.uid(),
        'new_balance', v_new_balance
    )
  );
  
  RETURN jsonb_build_object('new_balance', v_new_balance, 'success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_adjust_nice TO authenticated;
