-- Step 1b: access helper functions used by RLS and edge functions.
-- SECURITY DEFINER with a fixed search_path so they can read student_links and
-- profiles regardless of the caller's own RLS visibility.
begin;

create or replace function public.is_parent_of(p_student uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from student_links
    where parent_id = auth.uid() and student_id = p_student
  );
$$;

-- True when the caller may create student activity for p_student:
-- the student themselves, or a linked parent when p_student is a practice student.
create or replace function public.can_write_as(p_student uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select p_student = auth.uid()
      or exists (
        select 1 from student_links l join profiles p on p.id = l.student_id
        where l.parent_id = auth.uid() and l.student_id = p_student and p.is_practice
      );
$$;

create or replace function public.is_practice_student(p_student uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce((select is_practice from profiles where id = p_student), false);
$$;

revoke all on function public.is_parent_of(uuid), public.can_write_as(uuid), public.is_practice_student(uuid) from public;
grant execute on function public.is_parent_of(uuid), public.can_write_as(uuid), public.is_practice_student(uuid) to authenticated, service_role;

commit;
