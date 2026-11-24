-- The weekly plan now sets work: per-subject hours, a past-paper target, and
-- an approval step that creates the week's assignments (linked by plan_id).
alter table public.weekly_plans
  add column if not exists subject_minutes jsonb not null default '{}'::jsonb,
  add column if not exists papers int not null default 0 check (papers between 0 and 20),
  add column if not exists approved_at timestamptz;

alter table public.assignments add column if not exists plan_id uuid references public.weekly_plans(id) on delete set null;
create index if not exists assignments_plan_id_idx on public.assignments(plan_id);

-- Plan work not done by the end of its week becomes 'expired' (shown as
-- "not done"), so it never piles up as overdue.
alter table public.assignments drop constraint if exists assignments_status_check;
alter table public.assignments add constraint assignments_status_check
  check (status = any (array['pending', 'completed', 'cancelled', 'expired']));

create or replace function public.expire_plan_work() returns int
language sql security definer set search_path = public as $$
  with x as (
    update public.assignments set status = 'expired'
    where plan_id is not null and status = 'pending' and due_at < now()
    returning 1)
  select count(*)::int from x;
$$;
revoke all on function public.expire_plan_work() from public, anon, authenticated;

select cron.schedule('expire-plan-work', '15 * * * *', $$select public.expire_plan_work()$$);
