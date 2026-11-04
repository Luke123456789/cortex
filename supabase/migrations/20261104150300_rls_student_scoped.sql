-- Step 2: RLS keyed on student_id instead of "whoever is logged in".
--
-- Read:   student_id = auth.uid() OR is_parent_of(student_id)
-- Student-activity writes (quiz_sessions, student_question_history,
--   tutor_sessions, fm_attempts): can_write_as(student_id)
--   (the student themselves, or a linked parent for a practice student).
-- Parent-action writes (assignments, subject_locks, redemption decisions,
--   assessments): is_parent_of(student_id). A parent is linked to their
--   practice student too, so they can act on both.
-- ledger_entries: never written by students from the client; credits come
--   from edge functions (service role, bypasses RLS). A linked parent may
--   insert manual adjustments.
-- Content tables (subjects, topics, subtopics, questions, quizzes,
--   quiz_questions, fm_exam_questions, fm_mark_points) are unchanged:
--   readable by any authenticated user.
--
-- Deliberate choices:
--  * assessments are parent-only reports, so read is is_parent_of only
--    (the student could not read them before either).
--  * fm_attempt_point_results stays read-only for clients (marking is done
--    server-side); read follows the parent attempt.
--  * No client DELETE anywhere; practice reset goes through
--    reset_practice_data(), which checks the link and is_practice.
begin;

-- Drop every existing policy on the tables we own the rules for.
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in (
      'profiles', 'quiz_sessions', 'student_question_history', 'tutor_sessions',
      'fm_attempts', 'fm_attempt_point_results', 'assessments', 'assignments',
      'ledger_entries', 'redemption_requests', 'subject_locks')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles: yourself, your linked students, and (for a student) your linked parents.
create policy "profiles: self and linked" on profiles for select to authenticated
  using (
    id = auth.uid()
    or is_parent_of(id)
    or exists (select 1 from student_links l where l.student_id = auth.uid() and l.parent_id = profiles.id)
  );

-- quiz_sessions
create policy "quiz_sessions: read" on quiz_sessions for select to authenticated
  using (student_id = auth.uid() or is_parent_of(student_id));
create policy "quiz_sessions: write as student" on quiz_sessions for insert to authenticated
  with check (can_write_as(student_id));

-- student_question_history
create policy "sqh: read" on student_question_history for select to authenticated
  using (student_id = auth.uid() or is_parent_of(student_id));
create policy "sqh: write as student" on student_question_history for insert to authenticated
  with check (can_write_as(student_id));

-- tutor_sessions
create policy "tutor_sessions: read" on tutor_sessions for select to authenticated
  using (student_id = auth.uid() or is_parent_of(student_id));
create policy "tutor_sessions: insert as student" on tutor_sessions for insert to authenticated
  with check (can_write_as(student_id));
create policy "tutor_sessions: update as student" on tutor_sessions for update to authenticated
  using (can_write_as(student_id)) with check (can_write_as(student_id));

-- fm_attempts (+ child results, read-only for clients)
create policy "fm_attempts: read" on fm_attempts for select to authenticated
  using (student_id = auth.uid() or is_parent_of(student_id));
create policy "fm_attempts: write as student" on fm_attempts for insert to authenticated
  with check (can_write_as(student_id));
create policy "fm_attempt_point_results: read" on fm_attempt_point_results for select to authenticated
  using (exists (
    select 1 from fm_attempts a
    where a.id = fm_attempt_point_results.attempt_id
      and (a.student_id = auth.uid() or is_parent_of(a.student_id))));

-- assessments (parent-only reports)
create policy "assessments: parent read" on assessments for select to authenticated
  using (is_parent_of(student_id));
create policy "assessments: parent request" on assessments for insert to authenticated
  with check (is_parent_of(student_id) and requested_by = auth.uid());

-- assignments
create policy "assignments: read" on assignments for select to authenticated
  using (student_id = auth.uid() or is_parent_of(student_id));
create policy "assignments: parent create" on assignments for insert to authenticated
  with check (is_parent_of(student_id) and assigned_by = auth.uid());
create policy "assignments: parent update" on assignments for update to authenticated
  using (is_parent_of(student_id)) with check (is_parent_of(student_id));

-- subject_locks
create policy "subject_locks: read" on subject_locks for select to authenticated
  using (student_id = auth.uid() or is_parent_of(student_id));
create policy "subject_locks: parent insert" on subject_locks for insert to authenticated
  with check (is_parent_of(student_id));
create policy "subject_locks: parent update" on subject_locks for update to authenticated
  using (is_parent_of(student_id)) with check (is_parent_of(student_id));
create policy "subject_locks: parent delete" on subject_locks for delete to authenticated
  using (is_parent_of(student_id));

-- redemption_requests: the student (or parent in practice) asks; the parent decides.
create policy "redemptions: read" on redemption_requests for select to authenticated
  using (student_id = auth.uid() or is_parent_of(student_id));
create policy "redemptions: request as student" on redemption_requests for insert to authenticated
  with check (can_write_as(student_id) and status = 'pending');
create policy "redemptions: parent decides" on redemption_requests for update to authenticated
  using (is_parent_of(student_id)) with check (is_parent_of(student_id));

-- ledger_entries: read for the student and linked parents; manual
-- adjustments by a linked parent only. Credits come from the service role.
create policy "ledger: read" on ledger_entries for select to authenticated
  using (student_id = auth.uid() or is_parent_of(student_id));
create policy "ledger: parent adjustment" on ledger_entries for insert to authenticated
  with check (is_parent_of(student_id));

commit;
