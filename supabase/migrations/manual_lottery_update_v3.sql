-- MANUAL UPDATE V3: Cancelled Status & Refund Logic
-- Run this in Supabase SQL Editor to allow cancelling lotteries.

do $$
begin
  -- 1. Drop existing check constraint if it exists
  alter table public.lottery_drawings 
    drop constraint if exists lottery_drawings_status_check;

  -- 2. Add updated constraint
  alter table public.lottery_drawings 
    add constraint lottery_drawings_status_check 
    check (status in ('upcoming', 'active', 'drawn', 'awarded', 'cancelled'));
    
  -- 3. Add 'lottery_refund' to transaction types
  alter table public.nice_transactions 
    drop constraint if exists nice_transactions_transaction_type_check;

  alter table public.nice_transactions 
    add constraint nice_transactions_transaction_type_check 
    check (transaction_type in (
      'generated', 'collected', 'visit_bonus', 'converted_to_points',
      'gifted_sent', 'gifted_received', 'auction_bid', 'auction_refund',
      'raffle_ticket', 'donation', 'store_purchase', 'flash_sale',
      'expired', 'adjusted',
      'lottery_purchase', 'lottery_refund'
    ));

exception
    when others then 
        raise notice 'Error updating constraint: %', SQLERRM;
end $$;

-- 4. Create Cancel & Refund Function
create or replace function cancel_lottery_drawing(p_drawing_id uuid)
returns jsonb as $$
declare
  v_entry record;
  v_refund_count integer := 0;
  v_refund_amount integer := 0;
begin
  -- Check status
  if not exists (select 1 from public.lottery_drawings where id = p_drawing_id and status in ('active', 'upcoming')) then
     return jsonb_build_object('success', false, 'message', 'Drawing cannot be cancelled (wrong status)');
  end if;

  -- Update status
  update public.lottery_drawings 
  set status = 'cancelled', updated_at = now()
  where id = p_drawing_id;

  -- Process Refunds for Purchased Entries
  for v_entry in 
    select user_id, nice_spent 
    from public.lottery_entries 
    where drawing_id = p_drawing_id 
      and entry_type = 'purchased' 
      and nice_spent > 0
  loop
    -- Refund Balance
    update public.nice_accounts
    set nice_collected_balance = nice_collected_balance + v_entry.nice_spent,
        updated_at = now()
    where user_id = v_entry.user_id;
    
    -- Log Transaction
    insert into public.nice_transactions (
        user_id, transaction_type, nice_amount, metadata, description
    ) values (
        v_entry.user_id, 
        'lottery_refund', 
        v_entry.nice_spent, 
        jsonb_build_object('drawing_id', p_drawing_id),
        'Refund for cancelled lottery'
    );
    
    v_refund_count := v_refund_count + 1;
    v_refund_amount := v_refund_amount + v_entry.nice_spent;
  end loop;

  return jsonb_build_object(
    'success', true, 
    'message', 'Lottery cancelled',
    'refunds_processed', v_refund_count,
    'total_refunded', v_refund_amount
  );
end;
$$ language plpgsql security definer;
