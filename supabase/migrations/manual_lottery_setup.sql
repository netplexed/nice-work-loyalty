-- COMBINED LOTTERY MIGRATION
-- Run this in the Supabase SQL Editor to verify/repair the database state.

-- PART 1: TABLES AND SCHEMA
-- =========================

-- 1. Lottery Drawings Table
create table if not exists public.lottery_drawings (
  id uuid primary key default gen_random_uuid(),
  draw_date timestamptz not null,
  week_start_date date not null,
  prize_tier text not null check (prize_tier in ('standard', 'monthly', 'quarterly')),
  prize_description text not null,
  prize_value decimal(10,2) not null,
  status text not null check (status in ('upcoming', 'active', 'drawn', 'awarded')) default 'upcoming',
  
  -- Stats
  total_entries integer default 0,
  total_participants integer default 0,
  
  -- Results
  winning_ticket_number integer,
  random_seed text,
  drawn_at timestamptz,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.lottery_drawings enable row level security;

create index if not exists idx_lottery_drawings_status on public.lottery_drawings(status, week_start_date);
create index if not exists idx_lottery_drawings_draw_date on public.lottery_drawings(draw_date);


-- 2. Lottery Entries Table
create table if not exists public.lottery_entries (
  id uuid primary key default gen_random_uuid(),
  drawing_id uuid references public.lottery_drawings(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  entry_type text not null check (entry_type in ('base', 'purchased', 'visit', 'checkin')),
  
  nice_spent integer, -- NULL for free entries
  quantity integer not null default 1,
  
  visit_id uuid, -- Optional link to visit (Loose reference, table is check_ins)
  
  created_at timestamptz default now()
);

alter table public.lottery_entries enable row level security;

create index if not exists idx_lottery_entries_drawing on public.lottery_entries(drawing_id);
create index if not exists idx_lottery_entries_user on public.lottery_entries(user_id, drawing_id);
create index if not exists idx_lottery_entries_type on public.lottery_entries(drawing_id, entry_type);


-- 3. Lottery Winners Table
create table if not exists public.lottery_winners (
  id uuid primary key default gen_random_uuid(),
  drawing_id uuid references public.lottery_drawings(id) not null,
  user_id uuid references public.profiles(id) not null,
  
  prize_rank integer not null default 1,
  prize_description text not null,
  prize_value decimal(10,2) not null,
  
  voucher_code text unique,
  voucher_expiry_date date,
  
  claimed boolean default false,
  claimed_at timestamptz,
  
  notified boolean default false,
  notified_at timestamptz,
  
  created_at timestamptz default now()
);

alter table public.lottery_winners enable row level security;

create index if not exists idx_lottery_winners_drawing on public.lottery_winners(drawing_id);
create index if not exists idx_lottery_winners_user on public.lottery_winners(user_id);
create index if not exists idx_lottery_winners_voucher on public.lottery_winners(voucher_code);


-- 4. Lottery Stats Table (for analytics)
create table if not exists public.lottery_stats (
  id uuid primary key default gen_random_uuid(),
  drawing_id uuid references public.lottery_drawings(id) unique not null,
  
  total_participants integer not null,
  total_entries integer not null,
  total_nice_spent integer not null,
  
  avg_entries_per_user decimal(5,2),
  
  entries_purchased integer,
  entries_visit integer,
  entries_checkin integer,
  entries_base integer,
  
  created_at timestamptz default now()
);

alter table public.lottery_stats enable row level security;


-- 5. RLS Policies
-- Drop existing policies to avoid conflicts if re-running
drop policy if exists "Everyone can view drawings" on public.lottery_drawings;
create policy "Everyone can view drawings" on public.lottery_drawings for select using (true);

drop policy if exists "Users can view own entries" on public.lottery_entries;
create policy "Users can view own entries" on public.lottery_entries for select using (auth.uid() = user_id);

drop policy if exists "Everyone can view winners" on public.lottery_winners;
create policy "Everyone can view winners" on public.lottery_winners for select using (true);

drop policy if exists "Everyone can view stats" on public.lottery_stats;
create policy "Everyone can view stats" on public.lottery_stats for select using (true);


-- 6. Helper: Update Transaction Type Constraint (Safe way)
do $$
begin
  alter table public.nice_transactions 
    drop constraint if exists nice_transactions_transaction_type_check;

  alter table public.nice_transactions 
    add constraint nice_transactions_transaction_type_check 
    check (transaction_type in (
      'generated', 'collected', 'visit_bonus', 'converted_to_points',
      'gifted_sent', 'gifted_received', 'auction_bid', 'auction_refund',
      'raffle_ticket', 'donation', 'store_purchase', 'flash_sale',
      'expired', 'adjusted',
      -- New types
      'lottery_purchase'
    ));
exception
    when others then null; -- Ignore if constraint issues, manual fix might be needed
end $$;


-- PART 2: FUNCTIONS
-- =================

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
- -   M A N U A L   U P D A T E   V 2 :   L o t t e r y   F e a t u r e s 
 
 - -   R u n   t h i s   i n   S u p a b a s e   S Q L   E d i t o r   t o   a d d   s u p p o r t   f o r : 
 
 - -   1 .   R e w a r d - b a s e d   p r i z e s   ( n o t   j u s t   N I C E   p o i n t s ) 
 
 - -   2 .   F l e x i b l e   A u t o - E n t r y   r u l e s 
 
 
 
 - -   A d d   c o l u m n s   f o r   R e w a r d   P r i z e s 
 
 a l t e r   t a b l e   p u b l i c . l o t t e r y _ d r a w i n g s 
 
 a d d   c o l u m n   i f   n o t   e x i s t s   p r i z e _ t y p e   t e x t   c h e c k   ( p r i z e _ t y p e   i n   ( ' n i c e ' ,   ' r e w a r d ' ) )   d e f a u l t   ' n i c e ' , 
 
 a d d   c o l u m n   i f   n o t   e x i s t s   r e w a r d _ i d   u u i d   r e f e r e n c e s   p u b l i c . r e w a r d s ( i d ) ; 
 
 
 
 c r e a t e   i n d e x   i f   n o t   e x i s t s   i d x _ l o t t e r y _ d r a w i n g s _ r e w a r d   o n   p u b l i c . l o t t e r y _ d r a w i n g s ( r e w a r d _ i d ) ; 
 
 
 
 - -   A d d   c o l u m n   f o r   A u t o - E n t r y   C o n f i g 
 
 a l t e r   t a b l e   p u b l i c . l o t t e r y _ d r a w i n g s 
 
 a d d   c o l u m n   i f   n o t   e x i s t s   a u t o _ e n t r y _ c o n f i g   j s o n b ; 
 
 
 
 - -   C o m m e n t : 
 
 - -   p r i z e _ t y p e :   ' n i c e '   o r   ' r e w a r d ' 
 
 - -   r e w a r d _ i d :   L i n k   t o   t h e   r e w a r d   i f   p r i z e _ t y p e   i s   ' r e w a r d ' 
 
 - -   a u t o _ e n t r y _ c o n f i g :   J S O N   r u l e s   l i k e   {   " t y p e " :   " r e c e n t _ v i s i t " ,   " d a y s " :   3 0 ,   " q u a n t i t y " :   1   } 
 
 - -   M A N U A L   U P D A T E   V 3 :   C a n c e l l e d   S t a t u s 
 
 - -   R u n   t h i s   i n   S u p a b a s e   S Q L   E d i t o r   t o   a l l o w   c a n c e l l i n g   l o t t e r i e s . 
 
 
 
 d o   $ $ 
 
 b e g i n 
 
     - -   1 .   D r o p   e x i s t i n g   c h e c k   c o n s t r a i n t   i f   i t   e x i s t s   ( n a m e   m i g h t   v a r y ,   s o   w e   t r y   s t a n d a r d   n a m e   o r   s p e c i f i c ) 
 
     - -   S u p a b a s e / P o s t g r e s   u s u a l l y   n a m e s   i t   t a b l e _ c o l u m n _ c h e c k 
 
     
 
     a l t e r   t a b l e   p u b l i c . l o t t e r y _ d r a w i n g s   
 
         d r o p   c o n s t r a i n t   i f   e x i s t s   l o t t e r y _ d r a w i n g s _ s t a t u s _ c h e c k ; 
 
 
 
     - -   2 .   A d d   u p d a t e d   c o n s t r a i n t 
 
     a l t e r   t a b l e   p u b l i c . l o t t e r y _ d r a w i n g s   
 
         a d d   c o n s t r a i n t   l o t t e r y _ d r a w i n g s _ s t a t u s _ c h e c k   
 
         c h e c k   ( s t a t u s   i n   ( ' u p c o m i n g ' ,   ' a c t i v e ' ,   ' d r a w n ' ,   ' a w a r d e d ' ,   ' c a n c e l l e d ' ) ) ; 
 
         
 
 e x c e p t i o n 
 
         w h e n   o t h e r s   t h e n   
 
                 r a i s e   n o t i c e   ' E r r o r   u p d a t i n g   c o n s t r a i n t :   % ' ,   S Q L E R R M ; 
 
 e n d   $ $ ; 
 
 - -   M A N U A L   U P D A T E   V 3 :   C a n c e l l e d   S t a t u s   &   R e f u n d   L o g i c 
 
 - -   R u n   t h i s   i n   S u p a b a s e   S Q L   E d i t o r   t o   a l l o w   c a n c e l l i n g   l o t t e r i e s . 
 
 
 
 d o   $ $ 
 
 b e g i n 
 
     - -   1 .   D r o p   e x i s t i n g   c h e c k   c o n s t r a i n t   i f   i t   e x i s t s 
 
     a l t e r   t a b l e   p u b l i c . l o t t e r y _ d r a w i n g s   
 
         d r o p   c o n s t r a i n t   i f   e x i s t s   l o t t e r y _ d r a w i n g s _ s t a t u s _ c h e c k ; 
 
 
 
     - -   2 .   A d d   u p d a t e d   c o n s t r a i n t 
 
     a l t e r   t a b l e   p u b l i c . l o t t e r y _ d r a w i n g s   
 
         a d d   c o n s t r a i n t   l o t t e r y _ d r a w i n g s _ s t a t u s _ c h e c k   
 
         c h e c k   ( s t a t u s   i n   ( ' u p c o m i n g ' ,   ' a c t i v e ' ,   ' d r a w n ' ,   ' a w a r d e d ' ,   ' c a n c e l l e d ' ) ) ; 
 
         
 
     - -   3 .   A d d   ' l o t t e r y _ r e f u n d '   t o   t r a n s a c t i o n   t y p e s 
 
     a l t e r   t a b l e   p u b l i c . n i c e _ t r a n s a c t i o n s   
 
         d r o p   c o n s t r a i n t   i f   e x i s t s   n i c e _ t r a n s a c t i o n s _ t r a n s a c t i o n _ t y p e _ c h e c k ; 
 
 
 
     a l t e r   t a b l e   p u b l i c . n i c e _ t r a n s a c t i o n s   
 
         a d d   c o n s t r a i n t   n i c e _ t r a n s a c t i o n s _ t r a n s a c t i o n _ t y p e _ c h e c k   
 
         c h e c k   ( t r a n s a c t i o n _ t y p e   i n   ( 
 
             ' g e n e r a t e d ' ,   ' c o l l e c t e d ' ,   ' v i s i t _ b o n u s ' ,   ' c o n v e r t e d _ t o _ p o i n t s ' , 
 
             ' g i f t e d _ s e n t ' ,   ' g i f t e d _ r e c e i v e d ' ,   ' a u c t i o n _ b i d ' ,   ' a u c t i o n _ r e f u n d ' , 
 
             ' r a f f l e _ t i c k e t ' ,   ' d o n a t i o n ' ,   ' s t o r e _ p u r c h a s e ' ,   ' f l a s h _ s a l e ' , 
 
             ' e x p i r e d ' ,   ' a d j u s t e d ' , 
 
             ' l o t t e r y _ p u r c h a s e ' ,   ' l o t t e r y _ r e f u n d ' 
 
         ) ) ; 
 
 
 
 e x c e p t i o n 
 
         w h e n   o t h e r s   t h e n   
 
                 r a i s e   n o t i c e   ' E r r o r   u p d a t i n g   c o n s t r a i n t :   % ' ,   S Q L E R R M ; 
 
 e n d   $ $ ; 
 
 
 
 - -   4 .   C r e a t e   C a n c e l   &   R e f u n d   F u n c t i o n 
 
 c r e a t e   o r   r e p l a c e   f u n c t i o n   c a n c e l _ l o t t e r y _ d r a w i n g ( p _ d r a w i n g _ i d   u u i d ) 
 
 r e t u r n s   j s o n b   a s   $ $ 
 
 d e c l a r e 
 
     v _ e n t r y   r e c o r d ; 
 
     v _ r e f u n d _ c o u n t   i n t e g e r   : =   0 ; 
 
     v _ r e f u n d _ a m o u n t   i n t e g e r   : =   0 ; 
 
 b e g i n 
 
     - -   C h e c k   s t a t u s 
 
     i f   n o t   e x i s t s   ( s e l e c t   1   f r o m   p u b l i c . l o t t e r y _ d r a w i n g s   w h e r e   i d   =   p _ d r a w i n g _ i d   a n d   s t a t u s   i n   ( ' a c t i v e ' ,   ' u p c o m i n g ' ) )   t h e n 
 
           r e t u r n   j s o n b _ b u i l d _ o b j e c t ( ' s u c c e s s ' ,   f a l s e ,   ' m e s s a g e ' ,   ' D r a w i n g   c a n n o t   b e   c a n c e l l e d   ( w r o n g   s t a t u s ) ' ) ; 
 
     e n d   i f ; 
 
 
 
     - -   U p d a t e   s t a t u s 
 
     u p d a t e   p u b l i c . l o t t e r y _ d r a w i n g s   
 
     s e t   s t a t u s   =   ' c a n c e l l e d ' ,   u p d a t e d _ a t   =   n o w ( ) 
 
     w h e r e   i d   =   p _ d r a w i n g _ i d ; 
 
 
 
     - -   P r o c e s s   R e f u n d s   f o r   P u r c h a s e d   E n t r i e s 
 
     f o r   v _ e n t r y   i n   
 
         s e l e c t   u s e r _ i d ,   n i c e _ s p e n t   
 
         f r o m   p u b l i c . l o t t e r y _ e n t r i e s   
 
         w h e r e   d r a w i n g _ i d   =   p _ d r a w i n g _ i d   
 
             a n d   e n t r y _ t y p e   =   ' p u r c h a s e d '   
 
             a n d   n i c e _ s p e n t   >   0 
 
     l o o p 
 
         - -   R e f u n d   B a l a n c e 
 
         u p d a t e   p u b l i c . n i c e _ a c c o u n t s 
 
         s e t   n i c e _ c o l l e c t e d _ b a l a n c e   =   n i c e _ c o l l e c t e d _ b a l a n c e   +   v _ e n t r y . n i c e _ s p e n t , 
 
                 u p d a t e d _ a t   =   n o w ( ) 
 
         w h e r e   u s e r _ i d   =   v _ e n t r y . u s e r _ i d ; 
 
         
 
         - -   L o g   T r a n s a c t i o n 
 
         i n s e r t   i n t o   p u b l i c . n i c e _ t r a n s a c t i o n s   ( 
 
                 u s e r _ i d ,   t r a n s a c t i o n _ t y p e ,   n i c e _ a m o u n t ,   m e t a d a t a ,   d e s c r i p t i o n 
 
         )   v a l u e s   ( 
 
                 v _ e n t r y . u s e r _ i d ,   
 
                 ' l o t t e r y _ r e f u n d ' ,   
 
                 v _ e n t r y . n i c e _ s p e n t ,   
 
                 j s o n b _ b u i l d _ o b j e c t ( ' d r a w i n g _ i d ' ,   p _ d r a w i n g _ i d ) , 
 
                 ' R e f u n d   f o r   c a n c e l l e d   l o t t e r y ' 
 
         ) ; 
 
         
 
         v _ r e f u n d _ c o u n t   : =   v _ r e f u n d _ c o u n t   +   1 ; 
 
         v _ r e f u n d _ a m o u n t   : =   v _ r e f u n d _ a m o u n t   +   v _ e n t r y . n i c e _ s p e n t ; 
 
     e n d   l o o p ; 
 
 
 
     r e t u r n   j s o n b _ b u i l d _ o b j e c t ( 
 
         ' s u c c e s s ' ,   t r u e ,   
 
         ' m e s s a g e ' ,   ' L o t t e r y   c a n c e l l e d ' , 
 
         ' r e f u n d s _ p r o c e s s e d ' ,   v _ r e f u n d _ c o u n t , 
 
         ' t o t a l _ r e f u n d e d ' ,   v _ r e f u n d _ a m o u n t 
 
     ) ; 
 
 e n d ; 
 
 $ $   l a n g u a g e   p l p g s q l   s e c u r i t y   d e f i n e r ; 
 
 