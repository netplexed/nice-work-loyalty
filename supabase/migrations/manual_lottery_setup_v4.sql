
-- MANUAL UPDATE V4: Recalculate Stats
-- Run this to fix "0 Players" issue and support auto-recalculation
create or replace function recalculate_lottery_stats(p_drawing_id uuid)
returns void as $$
begin
  update public.lottery_drawings
  set 
    total_entries = (select count(*) from public.lottery_entries where drawing_id = p_drawing_id),
    total_participants = (select count(distinct user_id) from public.lottery_entries where drawing_id = p_drawing_id),
    updated_at = now()
  where id = p_drawing_id;
end;
$$ language plpgsql security definer;
