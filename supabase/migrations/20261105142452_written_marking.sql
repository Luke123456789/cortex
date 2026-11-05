-- Written answers, W1: AI marking of typed answers against a mark scheme.
--
-- * fm_mark_schemes: one per written question. Kept out of fm_exam_questions
--   so a student can read the question but never the scheme (students have
--   no select policy here; parents can read it; the marking function uses the
--   service role).
-- * fm_attempts: the detail of each marking, a review flag when the two
--   independent markings disagree, the minutes earned, and a parent override.
-- * Marking completes the matching written_test assignment (as quiz and
--   tutor sessions already do).
-- * Only the marking function writes fm_attempts now: the student insert
--   policy goes, so marks can't be written from the browser.

create table if not exists public.fm_mark_schemes (
  question_id uuid primary key references public.fm_exam_questions (id) on delete cascade,
  -- 'points': creditable points, one mark each (short answers).
  -- 'levels': level descriptors plus indicative content (extended answers).
  marking_style text not null check (marking_style in ('points', 'levels')),
  scheme jsonb not null,
  -- e.g. {"AO1": 2, "AO2": 2} (sums to total_marks minus spag_marks)
  ao_marks jsonb not null default '{}'::jsonb,
  spag_marks integer not null default 0 check (spag_marks >= 0),
  created_at timestamptz not null default now()
);

alter table public.fm_mark_schemes enable row level security;

create policy "fm_mark_schemes: parents read"
  on public.fm_mark_schemes for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'parent'));

alter table public.fm_attempts
  add column if not exists answer_source text not null default 'typed' check (answer_source in ('typed', 'photo')),
  add column if not exists assignment_id uuid references public.assignments (id) on delete set null,
  add column if not exists ao_awarded jsonb,
  add column if not exists level integer,
  add column if not exists credited jsonb,
  add column if not exists missing jsonb,
  add column if not exists next_step text,
  add column if not exists marking_runs jsonb,
  add column if not exists needs_review boolean not null default false,
  add column if not exists minutes_earned integer not null default 0,
  add column if not exists parent_marks integer,
  add column if not exists parent_note text,
  add column if not exists reviewed_by uuid references public.profiles (id),
  add column if not exists reviewed_at timestamptz;

alter table public.assignments
  add column if not exists fm_attempt_id uuid references public.fm_attempts (id) on delete set null;

drop policy if exists "fm_attempts: write as student" on public.fm_attempts;

-- Complete the oldest pending written_test assignment for this question.
create or replace function public.complete_assignment_on_fm_attempt()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.marked_at is not null and (TG_OP = 'INSERT' or old.marked_at is null) then
    update assignments
    set status = 'completed',
        completed_at = new.marked_at,
        fm_attempt_id = new.id
    where id = coalesce(new.assignment_id, (
      select id from assignments
      where type = 'written_test' and status = 'pending'
        and exam_question_id = new.question_id
        and student_id = new.student_id
      order by assigned_at asc
      limit 1
    ))
    and status = 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists on_fm_attempt_marked on public.fm_attempts;
create trigger on_fm_attempt_marked
  after insert or update on public.fm_attempts
  for each row execute function public.complete_assignment_on_fm_attempt();

-- A parent adjusts the mark on their student's answer. The AI mark stays in
-- marks_awarded; parent_marks wins wherever a mark is shown. Minutes already
-- earned are not changed.
create or replace function public.review_written_attempt(p_attempt uuid, p_marks integer, p_note text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_student uuid;
  v_total integer;
begin
  select student_id, total_marks into v_student, v_total from fm_attempts where id = p_attempt;
  if v_student is null then
    raise exception 'attempt not found';
  end if;
  if not is_parent_of(v_student) then
    raise exception 'not allowed';
  end if;
  if p_marks is not null and (p_marks < 0 or p_marks > v_total) then
    raise exception 'marks out of range';
  end if;
  update fm_attempts
  set parent_marks = p_marks,
      parent_note = nullif(trim(coalesce(p_note, '')), ''),
      needs_review = false,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_attempt;
end;
$$;

revoke all on function public.review_written_attempt(uuid, integer, text) from public, anon;
grant execute on function public.review_written_attempt(uuid, integer, text) to authenticated;

-- The two existing test questions have a subtopic but no topic, so Assign
-- work never listed them.
update public.fm_exam_questions q
set topic_id = s.topic_id
from public.subtopics s
where q.subtopic_id = s.id and q.topic_id is null;
