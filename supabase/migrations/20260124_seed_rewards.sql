-- Seed Initial Rewards
-- Using ON CONFLICT logic or Delete+Insert to ensure idempotency

DELETE FROM public.rewards WHERE category IN ('food', 'drink', 'voucher');

INSERT INTO public.rewards (name, description, points_cost, category, image_url, active)
VALUES
  ('Free Coffee', 'Enjoy a standard coffee on us!', 300, 'drink', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80', true),
  ('$5 Voucher', 'Get $5 off your next bill', 500, 'voucher', 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&w=400&q=80', true),
  ('Truffle Fries', 'Our signature truffle fries', 400, 'food', 'https://images.unsplash.com/photo-1573080496987-a223e75e92ac?auto=format&fit=crop&w=400&q=80', true),
  ('10% Off Bill', 'Get 10% off your entire bill', 1000, 'voucher', 'https://images.unsplash.com/photo-1554672408-730436b60dde?auto=format&fit=crop&w=400&q=80', true);

RAISE NOTICE 'Rewards seeded successfully'; 

-- Ensure permissions
GRANT SELECT ON public.rewards TO authenticated;
GRANT SELECT ON public.rewards TO service_role;
