-- Migration: Lottery Transaction Functions
-- Description: PL/PGSQL functions for atomic lottery operations

-- 1. Purchase Lottery Entries
create or replace function purchase_lottery_entries(
  p_user_id uuid,
  p_quantity integer,
  p_drawing_id uuid
)
returns jsonb as $$
declare
  v_nice_balance integer;
  v_cost integer;
  v_current_entries integer;
  v_new_balance integer;
begin
  -- Config
  v_cost := p_quantity * 200;

  -- 1. Check current drawing status
  if not exists (select 1 from public.lottery_drawings where id = p_drawing_id and status = 'active') then
     return jsonb_build_object('success', false, 'message', 'Drawing is not active');
  end if;

  -- 2. Check purchase limit (Max 10 per week/drawing)
  select coalesce(sum(quantity), 0) into v_current_entries
  from public.lottery_entries
  where user_id = p_user_id 
    and drawing_id = p_drawing_id 
    and entry_type = 'purchased';
    
  if (v_current_entries + p_quantity) > 10 then
    return jsonb_build_object('success', false, 'message', 'Purchase limit exceeded (Max 10)');
  end if;

  -- 3. Check Balance
  select nice_collected_balance into v_nice_balance
  from public.nice_accounts
  where user_id = p_user_id;
  
  if v_nice_balance < v_cost then
    return jsonb_build_object('success', false, 'message', 'Insufficient nice balance');
  end if;

  -- 4. Execute Transaction
  
  -- Deduct Nice
  update public.nice_accounts
  set 
    nice_collected_balance = nice_collected_balance - v_cost,
    total_nice_spent = total_nice_spent + v_cost,
    updated_at = now()
  where user_id = p_user_id
  returning nice_collected_balance into v_new_balance;
  
  -- Record Nice Transaction
  insert into public.nice_transactions (
    user_id, transaction_type, nice_amount, metadata
  ) values (
    p_user_id, 'lottery_purchase', -v_cost,
    jsonb_build_object('drawing_id', p_drawing_id, 'quantity', p_quantity)
  );
  
  -- Insert Lottery Entry
  insert into public.lottery_entries (
    drawing_id, user_id, entry_type, quantity, nice_spent
  ) values (
    p_drawing_id, p_user_id, 'purchased', p_quantity, v_cost
  );
  
  -- Update Drawing Stats
  update public.lottery_drawings
  set total_entries = total_entries + p_quantity,
      total_participants = (
        select count(distinct user_id) 
        from public.lottery_entries 
        where drawing_id = p_drawing_id
      )
  where id = p_drawing_id;

  return jsonb_build_object(
    'success', true, 
    'new_balance', v_new_balance,
    'entries_purchased', p_quantity
  );
end;
$$ language plpgsql security definer;


-- 2. Award Visit Bonus Entry
create or replace function award_lottery_visit_bonus(
  p_user_id uuid,
  p_visit_id uuid,
  p_drawing_id uuid
)
returns jsonb as $$
declare
  v_current_bonus_count integer;
begin
    -- Check if already awarded for this visit
    if exists (select 1 from public.lottery_entries where visit_id = p_visit_id and entry_type = 'visit') then
        return jsonb_build_object('success', false, 'message', 'Bonus already awarded for this visit');
    end if;

    -- Check limit (Max 3 per drawing)
    select coalesce(sum(quantity), 0) into v_current_bonus_count
    from public.lottery_entries
    where user_id = p_user_id 
      and drawing_id = p_drawing_id 
      and entry_type = 'visit';
      
    if v_current_bonus_count >= 3 then
       return jsonb_build_object('success', false, 'message', 'Max visit bonuses reached for this week');
    end if;
    
    -- Insert Entry
    insert into public.lottery_entries (
      drawing_id, user_id, entry_type, quantity, visit_id
    ) values (
      p_drawing_id, p_user_id, 'visit', 1, p_visit_id
    );
    
    -- Update Drawing Stats
     update public.lottery_drawings
      set total_entries = total_entries + 1,
          total_participants = (
            select count(distinct user_id) 
            from public.lottery_entries 
            where drawing_id = p_drawing_id
          )
      where id = p_drawing_id;
      
    return jsonb_build_object('success', true, 'message', '+1 lottery entry earned!');
end;
$$ language plpgsql security definer;


-- 3. Award Checkin Bonus Entry
create or replace function award_lottery_checkin_bonus(
  p_user_id uuid,
  p_drawing_id uuid
)
returns jsonb as $$
begin
    -- Check if already checked in this week (one per drawing)
    if exists (select 1 from public.lottery_entries where user_id = p_user_id and drawing_id = p_drawing_id and entry_type = 'checkin') then
        return jsonb_build_object('success', false, 'message', 'Check-in bonus already earned this week');
    end if;
    
    -- Insert Entry (Quantity 2)
    insert into public.lottery_entries (
      drawing_id, user_id, entry_type, quantity
    ) values (
      p_drawing_id, p_user_id, 'checkin', 2
    );
    
    -- Update Drawing Stats
     update public.lottery_drawings
      set total_entries = total_entries + 2,
          total_participants = (
            select count(distinct user_id) 
            from public.lottery_entries 
            where drawing_id = p_drawing_id
          )
      where id = p_drawing_id;
      
    return jsonb_build_object('success', true, 'message', '+2 lottery entries! Thanks for checking in!');
end;
$$ language plpgsql security definer;
