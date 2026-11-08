-- Mock papers: a whole exam paper set as one assignment.
--
-- * fm_papers: one row per paper (title, time allowed, calculator or not).
-- * fm_exam_questions.paper_ref / paper_number: the paper's questions, in
--   order. Paper questions are marked exactly like other written answers.
-- * assignments: new type 'mock_paper' with paper_ref, and started_at for
--   the paper timer.
-- * Marking an answer completes a written_test assignment as before; for a
--   mock_paper it completes only once every question has an answer.
-- * start_paper / finish_paper: the student starts the timer, or hands the
--   paper in early (unanswered questions score 0).

create table if not exists public.fm_papers (
  ref text primary key,
  subject_id uuid references public.subjects (id) on delete set null,
  title text not null,
  exam_board text,
  duration_minutes integer not null check (duration_minutes > 0),
  calculator boolean not null default true,
  total_marks integer not null check (total_marks > 0),
  instructions text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.fm_papers enable row level security;

drop policy if exists "fm_papers: read" on public.fm_papers;
create policy "fm_papers: read"
  on public.fm_papers for select to authenticated
  using (true);

alter table public.fm_exam_questions
  add column if not exists paper_ref text references public.fm_papers (ref) on delete set null,
  add column if not exists paper_number integer;

create unique index if not exists fm_exam_questions_paper_number
  on public.fm_exam_questions (paper_ref, paper_number)
  where paper_ref is not null;

alter table public.assignments
  add column if not exists paper_ref text references public.fm_papers (ref) on delete set null,
  add column if not exists started_at timestamptz;

alter table public.assignments drop constraint if exists assignments_type_check;
alter table public.assignments add constraint assignments_type_check
  check (type = any (array['quiz', 'tutor_session', 'written_test', 'past_paper', 'mock_paper']));

alter table public.assignments drop constraint if exists assignments_mock_paper_ref;
alter table public.assignments add constraint assignments_mock_paper_ref
  check (type <> 'mock_paper' or paper_ref is not null);

create or replace function public.complete_assignment_on_fm_attempt()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_target uuid;
  v_type text;
  v_paper text;
  v_answered integer;
  v_questions integer;
begin
  if new.marked_at is null or (TG_OP = 'UPDATE' and old.marked_at is not null) then
    return new;
  end if;

  v_target := coalesce(new.assignment_id, (
    select id from assignments
    where type = 'written_test' and status = 'pending'
      and exam_question_id = new.question_id
      and student_id = new.student_id
    order by assigned_at asc
    limit 1
  ));
  select type, paper_ref into v_type, v_paper from assignments where id = v_target;

  if v_type = 'mock_paper' then
    select count(distinct question_id) into v_answered
      from fm_attempts where assignment_id = v_target and marked_at is not null;
    select count(*) into v_questions
      from fm_exam_questions where paper_ref = v_paper and active;
    if v_answered >= v_questions then
      update assignments set status = 'completed', completed_at = new.marked_at
      where id = v_target and status = 'pending';
    end if;
  else
    update assignments
    set status = 'completed', completed_at = new.marked_at, fm_attempt_id = new.id
    where id = v_target and status = 'pending';
  end if;
  return new;
end;
$$;

-- Restated so this file stands alone (same trigger as written_marking).
drop trigger if exists on_fm_attempt_marked on public.fm_attempts;
create trigger on_fm_attempt_marked
  after insert or update on public.fm_attempts
  for each row execute function public.complete_assignment_on_fm_attempt();

-- The student (or a parent for their practice student) starts the clock.
create or replace function public.start_paper(p_assignment uuid)
returns timestamptz
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_student uuid;
  v_started timestamptz;
begin
  select student_id into v_student from assignments
  where id = p_assignment and type = 'mock_paper' and status = 'pending';
  if v_student is null then raise exception 'paper not found or already finished'; end if;
  if not can_write_as(v_student) then raise exception 'not allowed'; end if;
  update assignments set started_at = coalesce(started_at, now())
  where id = p_assignment
  returning started_at into v_started;
  return v_started;
end;
$$;

-- Hand the paper in now; questions not answered score 0.
create or replace function public.finish_paper(p_assignment uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_student uuid;
begin
  select student_id into v_student from assignments
  where id = p_assignment and type = 'mock_paper' and status = 'pending';
  if v_student is null then raise exception 'paper not found or already finished'; end if;
  if not can_write_as(v_student) then raise exception 'not allowed'; end if;
  update assignments set status = 'completed', completed_at = now()
  where id = p_assignment and status = 'pending';
end;
$$;

revoke all on function public.start_paper(uuid) from public, anon;
revoke all on function public.finish_paper(uuid) from public, anon;
grant execute on function public.start_paper(uuid) to authenticated;
grant execute on function public.finish_paper(uuid) to authenticated;
