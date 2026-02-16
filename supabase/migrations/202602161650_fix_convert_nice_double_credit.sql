-- Migration: Fix Convert Nice to Points Double Credit
-- Description:
-- The points balance is currently credited twice during conversion:
-- 1) direct update to profiles.points_balance inside RPC
-- 2) insert into points_transactions, which triggers update_points_balance()
-- This migration removes the direct profile update and relies on points_transactions trigger.

CREATE OR REPLACE FUNCTION public.convert_nice_to_points(
    p_user_id uuid,
    p_nice_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_nice_balance integer;
    v_new_points_balance integer;
    v_points_to_gain integer;
    c_conversion_rate integer := 4; -- 4 Nice = 1 Point
BEGIN
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_nice_amount < 4 THEN
        RAISE EXCEPTION 'Minimum 4 Nice required';
    END IF;

    v_points_to_gain := floor(p_nice_amount / c_conversion_rate);

    IF v_points_to_gain < 1 THEN
        RAISE EXCEPTION 'Amount results in 0 points';
    END IF;

    PERFORM 1
    FROM public.nice_accounts
    WHERE user_id = p_user_id
      AND nice_collected_balance >= p_nice_amount
    FOR UPDATE;

    IF NOT FOUND THEN
         RAISE EXCEPTION 'Insufficient Nice balance';
    END IF;

    UPDATE public.nice_accounts
    SET nice_collected_balance = nice_collected_balance - p_nice_amount
    WHERE user_id = p_user_id
    RETURNING nice_collected_balance INTO v_new_nice_balance;

    INSERT INTO public.nice_transactions (
        user_id, transaction_type, nice_amount, metadata
    ) VALUES (
        p_user_id, 'converted_to_points', -p_nice_amount,
        jsonb_build_object('points_gained', v_points_to_gain, 'rate', c_conversion_rate)
    );

    -- Single source of truth for point credit: points_transactions + after_points_transaction trigger
    INSERT INTO public.points_transactions (
        user_id, transaction_type, points, description, created_at
    ) VALUES (
        p_user_id, 'earned_bonus', v_points_to_gain, 'Converted from Nice', now()
    );

    SELECT points_balance
    INTO v_new_points_balance
    FROM public.profiles
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'new_nice_balance', v_new_nice_balance,
        'new_points_balance', v_new_points_balance,
        'points_gained', v_points_to_gain
    );
END;
$$;
