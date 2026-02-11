-- Migration: Lottery Points Prize Support
-- Description: Updates constraints to allow 'points' prize type and 'earned_lottery' transaction type

-- 1. Update lottery_drawings prize_type check constraint
do $$
begin
  alter table public.lottery_drawings 
    drop constraint if exists lottery_drawings_prize_type_check;

  alter table public.lottery_drawings 
    add constraint lottery_drawings_prize_type_check 
    check (prize_type in ('nice', 'reward', 'points'));
end $$;


-- 2. Update points_transactions transaction_type check constraint
do $$
begin
  alter table public.points_transactions 
    drop constraint if exists points_transactions_transaction_type_check;

  alter table public.points_transactions 
    add constraint points_transactions_transaction_type_check 
    check (transaction_type in (
      'earned_purchase', 'earned_bonus', 'earned_referral', 
      'earned_social', 'earned_spin', 'redeemed', 'voided', 
      'expired', 'adjusted',
      -- New Type
      'earned_lottery'
    ));
end $$;
