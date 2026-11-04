-- Step 2b: close a gap in can_write_as.
--
-- can_write_as(x) returned true for x = auth.uid() whatever the caller's role,
-- so a parent could write student-activity rows (quiz_sessions,
-- student_question_history, tutor_sessions, fm_attempts, redemption_requests)
-- under their own id. The old client did exactly that when the parent opened
-- the tutor, leaving a tutor session owned by the parent.
--
-- Now a self-write needs the caller to be a non-practice student. A linked
-- parent writing for their practice student is unchanged.
begin;

create or replace function public.can_write_as(p_student uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select (
        p_student = auth.uid()
        and exists (
          select 1 from profiles p
          where p.id = p_student and p.role = 'student' and not p.is_practice
        )
      )
      or exists (
        select 1 from student_links l join profiles p on p.id = l.student_id
        where l.parent_id = auth.uid() and l.student_id = p_student and p.is_practice
      );
$$;

-- Permissions are kept by create or replace; restated so this file stands alone.
revoke all on function public.can_write_as(uuid) from public;
grant execute on function public.can_write_as(uuid) to authenticated, service_role;

-- Cleanup: empty tutor sessions saved under a parent's id (no messages, no plan).
delete from tutor_sessions t
using profiles p
where p.id = t.student_id and p.role = 'parent'
  and t.message_count = 0 and t.lesson_plan is null;

commit;
