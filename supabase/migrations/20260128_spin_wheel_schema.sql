-- Add is_hidden to rewards to allow "Wheel Only" rewards
ALTER TABLE public.rewards 
ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

-- Spin Wheel Configuration Table
CREATE TABLE IF NOT EXISTS public.spin_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL, -- "100 Points", "Free Burger"
  type text NOT NULL CHECK (type IN ('points', 'reward', 'loss')),
  points_value integer, -- For 'points' type
  reward_id uuid REFERENCES public.rewards(id), -- For 'reward' type
  probability float NOT NULL DEFAULT 0, -- 0 to 1, sets relative weight
  color text NOT NULL, -- Background color of the segment
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for spin_prizes
ALTER TABLE public.spin_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active spin prizes"
  ON public.spin_prizes FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage spin prizes"
  ON public.spin_prizes FOR ALL
  USING (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE id = auth.uid() AND active = true
    )
  );

-- Function to process a spin securely
CREATE OR REPLACE FUNCTION process_spin()
RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_prize record;
    v_prizes record;
    v_random float;
    v_cumulative float := 0;
    v_total_weight float := 0;
    v_can_spin boolean;
    v_spin_id uuid;
    v_voucher_code text;
BEGIN
    v_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check daily eligibility
    SELECT can_spin_today(v_user_id) INTO v_can_spin;
    IF NOT v_can_spin THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already spun today');
    END IF;

    -- Calculate total weight for normalization
    SELECT sum(probability) INTO v_total_weight
    FROM public.spin_prizes
    WHERE active = true;

    IF v_total_weight IS NULL OR v_total_weight = 0 THEN
         RAISE EXCEPTION 'No active prizes configured';
    END IF;

    -- Random selection
    v_random := random() * v_total_weight;

    -- Select the prize based on weight
    FOR v_prize IN 
        SELECT * FROM public.spin_prizes 
        WHERE active = true 
        ORDER BY probability DESC -- Order doesn't strictly matter for weight logic but good for determinism in loops
    LOOP
        v_cumulative := v_cumulative + v_prize.probability;
        IF v_random <= v_cumulative THEN
            EXIT; -- Found our winner in v_prize
        END IF;
    END LOOP;

    -- Fallback safety (shouldn't happen if math works)
    IF v_prize IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Prize selection failed');
    END IF;

    -- Record the Spin
    INSERT INTO public.spins (
        user_id, 
        spin_type, 
        prize_type, 
        prize_value, 
        prize_description
    ) VALUES (
        v_user_id,
        'daily',
        v_prize.type,
        CASE WHEN v_prize.type = 'points' THEN v_prize.points_value ELSE 0 END,
        v_prize.label
    ) RETURNING id INTO v_spin_id;

    -- Award the Prize
    IF v_prize.type = 'points' AND v_prize.points_value > 0 THEN
        -- Add points transaction
        INSERT INTO public.points_transactions (
            user_id,
            transaction_type,
            points,
            description,
            reference_id
        ) VALUES (
            v_user_id,
            'earned_spin',
            v_prize.points_value,
            'Won from Daily Spin: ' || v_prize.label,
            v_spin_id
        );
        
    ELSIF v_prize.type = 'reward' AND v_prize.reward_id IS NOT NULL THEN
        -- Generate simplistic voucher code
        v_voucher_code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Create redemption with 36 HOUR EXPIRY
        INSERT INTO public.redemptions (
            user_id,
            reward_id,
            points_spent, -- 0 cost for won rewards
            status,
            voucher_code,
            expires_at
        ) VALUES (
            v_user_id,
            v_prize.reward_id,
            0,
            'approved', -- Automatically usable
            v_voucher_code,
            now() + interval '36 hours'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'prize', to_jsonb(v_prize),
        'spin_id', v_spin_id
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed some initial prizes (Generic)
-- Note: These reference dummy IDs or manual entry is expected elsewhere. 
-- For safety we only insert if empty.
DO $$
DECLARE
    v_count int;
BEGIN
    SELECT count(*) INTO v_count FROM public.spin_prizes;
    
    IF v_count = 0 THEN
        INSERT INTO public.spin_prizes (label, type, points_value, probability, color)
        VALUES 
        ('50 Points', 'points', 50, 0.3, '#E2E8F0'), 
        ('100 Points', 'points', 100, 0.2, '#CBD5E1'),
        ('Try Again', 'loss', 0, 0.4, '#F1F5F9'),
        ('Jackpot!', 'points', 500, 0.05, '#FDBA74');
        -- Rewards would need actual UUIDs so skipping them in seed or doing a lookup
    END IF;
END $$;
