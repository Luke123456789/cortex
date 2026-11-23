alter table public.tutor_sessions add column if not exists grade jsonb;
comment on column public.tutor_sessions.grade is 'Grader output for a completed session: feedback, quality, answers counted, exam question/answer/mark. Written by grade-tutor-session (service role).';

-- Only the grading function (service role) may set or change a session's grade,
-- so a shared mark is always the grader's, never edited from the app.
create or replace function public.protect_tutor_session_grade()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_op = 'INSERT' then
      new.grade := null;
    elsif new.grade is distinct from old.grade then
      new.grade := old.grade;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_tutor_session_grade on public.tutor_sessions;
create trigger protect_tutor_session_grade
before insert or update on public.tutor_sessions
for each row execute function public.protect_tutor_session_grade();
