-- A parent's targets for one student for one week (Monday to Sunday).
create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  set_by uuid not null references public.profiles(id),
  tutor_sessions int not null default 0 check (tutor_sessions between 0 and 50),
  exam_questions int not null default 0 check (exam_questions between 0 and 200),
  quizzes int not null default 0 check (quizzes between 0 and 100),
  study_minutes int not null default 0 check (study_minutes between 0 and 3000),
  subject_ids uuid[] not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, week_start)
);

alter table public.weekly_plans enable row level security;

create policy "weekly_plans: read" on public.weekly_plans
  for select using (student_id = auth.uid() or public.is_parent_of(student_id));
create policy "weekly_plans: parent create" on public.weekly_plans
  for insert with check (public.is_parent_of(student_id) and set_by = auth.uid());
create policy "weekly_plans: parent update" on public.weekly_plans
  for update using (public.is_parent_of(student_id)) with check (public.is_parent_of(student_id));
create policy "weekly_plans: parent delete" on public.weekly_plans
  for delete using (public.is_parent_of(student_id));

create or replace function public.touch_weekly_plan() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
create trigger touch_weekly_plan before update on public.weekly_plans
  for each row execute function public.touch_weekly_plan();
