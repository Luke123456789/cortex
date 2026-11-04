-- Step 1c: every student-data row belongs to a student_id.
--
-- Adds student_id to assessments, assignments, ledger_entries,
-- redemption_requests and subject_locks; backfills every existing row with
-- James's id (found via student_links, never hard-coded); then NOT NULL + FK.
-- Existing student_id columns get FKs to profiles too.
--
-- Also:
--  * the parent's own 4 test tutor sessions move to the practice student;
--  * assignment auto-completion only completes the *same student's* assignment;
--  * the tutor reward RPC writes the ledger row for the session's student and
--    credits nothing for practice students;
--  * get_screen_time_balance(p_student) for a per-student balance;
--  * reset_practice_data(p_student) for the app's "Reset practice data" button;
--  * TRANSITIONAL: until the edge functions and front end send student_id
--    (steps 3-4), a BEFORE INSERT trigger fills a missing student_id with the
--    one real (non-practice) student. Dropped once every caller sends it.
begin;

do $$
declare
  v_james uuid;
  v_parent uuid;
  v_practice uuid;
  v_n int;
begin
  select count(*) into v_n
  from student_links l join profiles p on p.id = l.student_id where not p.is_practice;
  if v_n <> 1 then raise exception 'expected exactly one linked real student, found %', v_n; end if;
  select l.student_id, l.parent_id into v_james, v_parent
  from student_links l join profiles p on p.id = l.student_id where not p.is_practice;
  select l.student_id into v_practice
  from student_links l join profiles p on p.id = l.student_id where p.is_practice and l.parent_id = v_parent;

  -- New columns, backfilled with James.
  alter table assessments         add column if not exists student_id uuid;
  alter table assignments         add column if not exists student_id uuid;
  alter table ledger_entries      add column if not exists student_id uuid;
  alter table redemption_requests add column if not exists student_id uuid;
  alter table subject_locks       add column if not exists student_id uuid;
  update assessments         set student_id = v_james where student_id is null;
  update assignments         set student_id = v_james where student_id is null;
  update ledger_entries      set student_id = v_james where student_id is null;
  update redemption_requests set student_id = v_james where student_id is null;
  update subject_locks       set student_id = v_james where student_id is null;

  -- The parent's own test tutor sessions were never James's: give them to practice.
  update tutor_sessions set student_id = v_practice where student_id = v_parent;
  update quiz_sessions set student_id = v_practice where student_id = v_parent;
  update student_question_history set student_id = v_practice where student_id = v_parent;
  update fm_attempts set student_id = v_practice where student_id = v_parent;
end $$;

alter table assessments         alter column student_id set not null;
alter table assignments         alter column student_id set not null;
alter table ledger_entries      alter column student_id set not null;
alter table redemption_requests alter column student_id set not null;
alter table subject_locks       alter column student_id set not null;

-- FKs to profiles (no cascade: deleting a profile must never silently drop history).
alter table assessments              add constraint assessments_student_id_fkey              foreign key (student_id) references profiles(id);
alter table assignments              add constraint assignments_student_id_fkey              foreign key (student_id) references profiles(id);
alter table ledger_entries           add constraint ledger_entries_student_id_fkey           foreign key (student_id) references profiles(id);
alter table redemption_requests      add constraint redemption_requests_student_id_fkey      foreign key (student_id) references profiles(id);
alter table subject_locks            add constraint subject_locks_student_id_fkey            foreign key (student_id) references profiles(id);
alter table quiz_sessions            add constraint quiz_sessions_student_id_fkey            foreign key (student_id) references profiles(id);
alter table student_question_history add constraint student_question_history_student_id_fkey foreign key (student_id) references profiles(id);
alter table tutor_sessions           add constraint tutor_sessions_student_id_fkey           foreign key (student_id) references profiles(id);
alter table fm_attempts              add constraint fm_attempts_student_id_fkey              foreign key (student_id) references profiles(id);

create index if not exists assessments_student_idx              on assessments (student_id);
create index if not exists assignments_student_idx              on assignments (student_id, status);
create index if not exists ledger_entries_student_idx           on ledger_entries (student_id);
create index if not exists redemption_requests_student_idx      on redemption_requests (student_id);
create index if not exists subject_locks_student_idx            on subject_locks (student_id);
create index if not exists quiz_sessions_student_idx            on quiz_sessions (student_id);
create index if not exists student_question_history_student_idx on student_question_history (student_id);
create index if not exists tutor_sessions_student_idx           on tutor_sessions (student_id);
create index if not exists fm_attempts_student_idx              on fm_attempts (student_id);

-- TRANSITIONAL default for callers that don't send student_id yet.
create or replace function public.fill_default_student_id()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_student uuid; v_n int;
begin
  if new.student_id is null then
    select count(*) into v_n from student_links l join profiles p on p.id = l.student_id where not p.is_practice;
    if v_n <> 1 then
      raise exception '%.student_id is required (more than one student is linked)', TG_TABLE_NAME;
    end if;
    select l.student_id into v_student from student_links l join profiles p on p.id = l.student_id where not p.is_practice;
    new.student_id := v_student;
  end if;
  return new;
end $$;

create trigger fill_default_student_id before insert on assessments         for each row execute function fill_default_student_id();
create trigger fill_default_student_id before insert on assignments         for each row execute function fill_default_student_id();
create trigger fill_default_student_id before insert on ledger_entries      for each row execute function fill_default_student_id();
create trigger fill_default_student_id before insert on redemption_requests for each row execute function fill_default_student_id();
create trigger fill_default_student_id before insert on subject_locks       for each row execute function fill_default_student_id();

-- Assignment auto-completion: only the same student's pending assignment.
create or replace function public.complete_assignment_on_quiz_session()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.completed_at is not null and (TG_OP = 'INSERT' or old.completed_at is null) then
    update assignments
    set status = 'completed',
        completed_at = new.completed_at,
        quiz_session_id = new.id
    where id = (
      select id from assignments
      where type = 'quiz' and status = 'pending' and quiz_id = new.quiz_id
        and student_id = new.student_id
      order by assigned_at asc
      limit 1
    );
  end if;
  return new;
end;
$$;

create or replace function public.complete_assignment_on_tutor_session()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.completed_at is not null and (TG_OP = 'INSERT' or old.completed_at is null) then
    update assignments
    set status = 'completed',
        completed_at = new.completed_at,
        tutor_session_id = new.id
    where id = (
      select id from assignments
      where type = 'tutor_session' and status = 'pending' and subtopic_id = new.subtopic_id
        and student_id = new.student_id
      order by assigned_at asc
      limit 1
    );
  end if;
  return new;
end;
$$;

-- Tutor reward: ledger row belongs to the session's student; practice
-- students are graded and marked claimed but credited nothing.
create or replace function public.grade_and_claim_tutor_reward(p_session_id uuid, p_minutes integer)
returns table(claimed boolean, minutes_awarded integer)
language plpgsql security definer
set search_path to 'public'
as $function$
declare
  v_updated_id uuid;
  v_student uuid;
  v_practice boolean;
begin
  if p_minutes is null or p_minutes < 2 or p_minutes > 30 then
    raise exception 'p_minutes must be between 2 and 30, got %', p_minutes;
  end if;

  select s.student_id, coalesce(p.is_practice, false) into v_student, v_practice
  from tutor_sessions s left join profiles p on p.id = s.student_id
  where s.id = p_session_id;

  update tutor_sessions
    set reward_claimed = true,
        minutes_earned = case when v_practice then 0 else p_minutes end,
        completed_at = coalesce(completed_at, now())
    where id = p_session_id
      and reward_claimed = false
      and message_count > 0
    returning id into v_updated_id;

  if v_updated_id is null then
    return query select false, null::integer;
    return;
  end if;

  if v_practice then
    return query select true, 0;
    return;
  end if;

  insert into ledger_entries (type, amount_minutes, source, tutor_session_id, student_id)
  values ('earn', p_minutes, 'Ask the tutor', p_session_id, v_student)
  on conflict (tutor_session_id) where (source = 'Ask the tutor' and type = 'earn') do nothing;

  return query select true, p_minutes;
end;
$function$;

-- Per-student balance. The zero-argument version is kept for the current
-- front end (RLS scopes it to the rows the caller can see).
create or replace function public.get_screen_time_balance(p_student uuid)
returns integer
language sql stable
as $$
  select coalesce(sum(case when type = 'earn' then amount_minutes else -amount_minutes end), 0)::integer
  from ledger_entries
  where student_id = p_student;
$$;

-- "Reset practice data": deletes every row belonging to a practice student.
-- Only a linked parent may call it, and only for a practice student.
create or replace function public.reset_practice_data(p_student uuid)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v jsonb := '{}'::jsonb;
  n int;
begin
  if not is_parent_of(p_student) then
    raise exception 'not allowed: you are not linked to this student' using errcode = '42501';
  end if;
  if not is_practice_student(p_student) then
    raise exception 'not allowed: % is not a practice student', p_student using errcode = '42501';
  end if;

  -- Children first. Assignments reference sessions with ON DELETE SET NULL.
  delete from fm_attempt_point_results where attempt_id in (select id from fm_attempts where student_id = p_student);
  get diagnostics n = row_count; v := v || jsonb_build_object('fm_attempt_point_results', n);
  delete from ledger_entries where student_id = p_student;           get diagnostics n = row_count; v := v || jsonb_build_object('ledger_entries', n);
  delete from redemption_requests where student_id = p_student;      get diagnostics n = row_count; v := v || jsonb_build_object('redemption_requests', n);
  delete from assignments where student_id = p_student;              get diagnostics n = row_count; v := v || jsonb_build_object('assignments', n);
  delete from subject_locks where student_id = p_student;            get diagnostics n = row_count; v := v || jsonb_build_object('subject_locks', n);
  delete from assessments where student_id = p_student;              get diagnostics n = row_count; v := v || jsonb_build_object('assessments', n);
  delete from student_question_history where student_id = p_student; get diagnostics n = row_count; v := v || jsonb_build_object('student_question_history', n);
  delete from fm_attempts where student_id = p_student;              get diagnostics n = row_count; v := v || jsonb_build_object('fm_attempts', n);
  delete from quiz_sessions where student_id = p_student;            get diagnostics n = row_count; v := v || jsonb_build_object('quiz_sessions', n);
  delete from tutor_sessions where student_id = p_student;           get diagnostics n = row_count; v := v || jsonb_build_object('tutor_sessions', n);
  return v;
end $$;

revoke all on function public.reset_practice_data(uuid) from public;
grant execute on function public.reset_practice_data(uuid) to authenticated;

commit;
