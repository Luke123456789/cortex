-- Minutes for a flagged written answer are held until a parent decides.
-- release_written_reward pays them (worked out from the parent's mark if
-- they changed it) or withholds them.
alter table public.fm_attempts
  add column if not exists minutes_held integer not null default 0,
  add column if not exists reward_decision text check (reward_decision in ('released', 'withheld')),
  add column if not exists reward_decided_at timestamptz;

create or replace function public.release_written_reward(p_attempt uuid, p_release boolean)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  a record;
  v_marks integer;
  v_minutes integer := 0;
begin
  select f.*, p.is_practice into a
  from fm_attempts f join profiles p on p.id = f.student_id
  where f.id = p_attempt
  for update of f;
  if a.id is null then
    raise exception 'attempt not found';
  end if;
  if not is_parent_of(a.student_id) then
    raise exception 'not allowed';
  end if;
  if a.reward_decision is not null or a.minutes_held = 0 then
    raise exception 'nothing to release';
  end if;

  if p_release then
    -- Same rule as the marking function: 1 a mark, +5 at 70%; practice earns nothing.
    v_marks := coalesce(a.parent_marks, a.marks_awarded);
    if not coalesce(a.is_practice, false) and a.total_marks > 0 then
      v_minutes := v_marks + case when v_marks::numeric / a.total_marks >= 0.7 then 5 else 0 end;
    end if;
    if v_minutes > 0 then
      insert into ledger_entries (student_id, type, amount_minutes, source, note)
      values (a.student_id, 'earn', v_minutes, 'Written test', v_marks || '/' || a.total_marks || ' (released)');
    end if;
  end if;

  update fm_attempts
  set minutes_earned = v_minutes,
      minutes_held = 0,
      reward_decision = case when p_release then 'released' else 'withheld' end,
      reward_decided_at = now()
  where id = p_attempt;
  return v_minutes;
end;
$$;

revoke all on function public.release_written_reward(uuid, boolean) from public, anon;
grant execute on function public.release_written_reward(uuid, boolean) to authenticated;
