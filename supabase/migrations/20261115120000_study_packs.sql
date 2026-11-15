-- Study packs: a parent assigns a bundle of work on one topic (tutor
-- sessions, quizzes, written questions and an exam practice set) in one go,
-- and the student works through one pack per subject at a time.
--
-- A pack is a grouping on top of ordinary assignments: each step is a normal
-- assignments row with pack_id and pack_position, so the existing completion
-- triggers, edge functions, rewards and work history all keep working. A
-- trigger marks the pack completed when none of its steps is still pending.
--
-- Also here, because packs need them:
--   * quizzes.subtopic_id: a quiz made for one subtopic (null for topic quizzes)
--   * fm_papers.topic_id: a short paper covering one topic (null for full papers)
--   * quiz_sessions.assignment_id / tutor_sessions.assignment_id: the
--     assignment the student started from. Completion now ticks off that
--     assignment when it is still pending and matches, and only falls back to
--     the oldest matching pending assignment otherwise. Without this, a tutor
--     session started from a pack would tick off an older loose assignment
--     for the same subtopic instead of the pack step.

create table if not exists public.study_packs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id),
  subject_id uuid references public.subjects (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  title text not null,
  note text,
  due_at timestamptz,
  assigned_by uuid not null references auth.users (id),
  assigned_at timestamptz not null default now(),
  -- Order within the student's packs for the subject: the pending pack with
  -- the lowest position is the one to work on now.
  queue_position integer not null default 1,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  completed_at timestamptz
);

create index if not exists study_packs_student_queue on public.study_packs (student_id, subject_id, status, queue_position);

alter table public.study_packs enable row level security;
grant select, insert, update on public.study_packs to authenticated;

drop policy if exists "study_packs: read" on public.study_packs;
drop policy if exists "study_packs: parent create" on public.study_packs;
drop policy if exists "study_packs: parent update" on public.study_packs;

create policy "study_packs: read" on public.study_packs for select to authenticated
  using (student_id = auth.uid() or is_parent_of(student_id));
create policy "study_packs: parent create" on public.study_packs for insert to authenticated
  with check (is_parent_of(student_id) and assigned_by = auth.uid());
create policy "study_packs: parent update" on public.study_packs for update to authenticated
  using (is_parent_of(student_id)) with check (is_parent_of(student_id));

alter table public.assignments
  add column if not exists pack_id uuid references public.study_packs (id) on delete cascade,
  add column if not exists pack_position integer;
create index if not exists assignments_pack on public.assignments (pack_id, pack_position) where pack_id is not null;

alter table public.quizzes add column if not exists subtopic_id uuid references public.subtopics (id) on delete set null;
alter table public.fm_papers add column if not exists topic_id uuid references public.topics (id) on delete set null;

alter table public.quiz_sessions add column if not exists assignment_id uuid references public.assignments (id) on delete set null;
alter table public.tutor_sessions add column if not exists assignment_id uuid references public.assignments (id) on delete set null;

-- Completion: the assignment the student started from, if it still fits;
-- otherwise the oldest matching pending assignment (the old behaviour).
create or replace function public.complete_assignment_on_quiz_session()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_target uuid;
begin
  if new.completed_at is not null and (TG_OP = 'INSERT' or old.completed_at is null) then
    select id into v_target from assignments
    where id = new.assignment_id and type = 'quiz' and status = 'pending'
      and quiz_id = new.quiz_id and student_id = new.student_id;
    if v_target is null then
      select id into v_target from assignments
      where type = 'quiz' and status = 'pending' and quiz_id = new.quiz_id
        and student_id = new.student_id
      order by assigned_at asc
      limit 1;
    end if;
    update assignments
    set status = 'completed', completed_at = new.completed_at, quiz_session_id = new.id
    where id = v_target;
  end if;
  return new;
end;
$$;

create or replace function public.complete_assignment_on_tutor_session()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_target uuid;
begin
  if new.completed_at is not null and (TG_OP = 'INSERT' or old.completed_at is null) then
    select id into v_target from assignments
    where id = new.assignment_id and type = 'tutor_session' and status = 'pending'
      and subtopic_id = new.subtopic_id and student_id = new.student_id;
    if v_target is null then
      select id into v_target from assignments
      where type = 'tutor_session' and status = 'pending' and subtopic_id = new.subtopic_id
        and student_id = new.student_id
      order by assigned_at asc
      limit 1;
    end if;
    update assignments
    set status = 'completed', completed_at = new.completed_at, tutor_session_id = new.id
    where id = v_target;
  end if;
  return new;
end;
$$;

-- A pack is done when none of its steps is still pending.
create or replace function public.complete_study_pack()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.pack_id is not null and new.status <> 'pending' and old.status = 'pending' then
    update study_packs
    set status = 'completed', completed_at = coalesce(new.completed_at, now())
    where id = new.pack_id and status = 'pending'
      and not exists (select 1 from assignments a where a.pack_id = new.pack_id and a.status = 'pending');
  end if;
  return new;
end;
$$;

drop trigger if exists on_assignment_pack_progress on public.assignments;
create trigger on_assignment_pack_progress
  after update of status on public.assignments
  for each row execute function public.complete_study_pack();

-- Create a pack and its steps in one go. Runs as the caller, so the RLS
-- policies above (parent of the student, assigned_by = caller) apply.
-- p_items: [{type, title, subtopic_id?, quiz_id?, exam_question_id?, paper_ref?}]
-- in the order the student should do them.
create or replace function public.create_study_pack(
  p_student uuid, p_subject uuid, p_topic uuid, p_title text,
  p_note text, p_due timestamptz, p_items jsonb
) returns uuid
language plpgsql security invoker
set search_path = public
as $$
declare
  v_pack uuid;
  v_position integer;
  v_bad text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A study pack needs at least one step';
  end if;
  select i->>'type' into v_bad from jsonb_array_elements(p_items) i
  where coalesce(i->>'type', '') not in ('tutor_session', 'quiz', 'written_test', 'mock_paper')
     or (i->>'type' = 'tutor_session' and i->>'subtopic_id' is null)
     or (i->>'type' = 'quiz' and i->>'quiz_id' is null)
     or (i->>'type' = 'written_test' and i->>'exam_question_id' is null)
     or (i->>'type' = 'mock_paper' and i->>'paper_ref' is null)
  limit 1;
  if found then
    raise exception 'Study pack step is incomplete or of an unknown type: %', coalesce(v_bad, '(none)');
  end if;

  select coalesce(max(queue_position), 0) + 1 into v_position
  from study_packs where student_id = p_student and subject_id is not distinct from p_subject;

  insert into study_packs (student_id, subject_id, topic_id, title, note, due_at, assigned_by, queue_position)
  values (p_student, p_subject, p_topic, p_title, nullif(btrim(p_note), ''), p_due, auth.uid(), v_position)
  returning id into v_pack;

  insert into assignments (student_id, type, subject_id, topic_id, subtopic_id, quiz_id, exam_question_id, paper_ref,
                           title, due_at, assigned_by, pack_id, pack_position)
  select p_student, i->>'type', p_subject, p_topic, (i->>'subtopic_id')::uuid, (i->>'quiz_id')::uuid,
         (i->>'exam_question_id')::uuid, i->>'paper_ref', coalesce(nullif(i->>'title', ''), 'Pack step'),
         p_due, auth.uid(), v_pack, n::integer
  from jsonb_array_elements(p_items) with ordinality as x(i, n);

  return v_pack;
end;
$$;

revoke all on function public.create_study_pack(uuid, uuid, uuid, text, text, timestamptz, jsonb) from public, anon;
grant execute on function public.create_study_pack(uuid, uuid, uuid, text, text, timestamptz, jsonb) to authenticated;
revoke all on function public.complete_study_pack() from public, anon;
