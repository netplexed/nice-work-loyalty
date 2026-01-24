-- Redefine the function to be absolutely sure
CREATE OR REPLACE FUNCTION debug_reset_daily_spin(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spin_count integer;
BEGIN
  WITH deleted_spins AS (
    DELETE FROM public.spins
    WHERE user_id = p_user_id
    AND spin_type = 'daily'
    RETURNING *
  )
  SELECT count(*) INTO v_spin_count FROM deleted_spins;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_spins', v_spin_count
  );
END;
$$;

-- Grant permissions explicitly
GRANT EXECUTE ON FUNCTION debug_reset_daily_spin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION debug_reset_daily_spin(uuid) TO service_role;

-- Force Schema Cache Reload (Crucial for PGRST202 error)
NOTIFY pgrst, 'reload schema';
