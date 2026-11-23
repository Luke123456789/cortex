-- Overnight content generation queue, worked by the generate-exam-content
-- edge function (called by pg_cron through pg_net). Applied as migrations
-- content_jobs_queue, content_jobs_claim_counts_failures,
-- content_cron_secret_check and content_jobs_grants.
alter table public.fm_exam_questions add column if not exists generation_batch text;
alter table public.fm_papers add column if not exists generation_batch text;

create table if not exists public.content_jobs (
  id bigserial primary key,
  kind text not null check (kind in ('questions', 'paper')),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete cascade,
  component int,
  paper_ref text,
  plan jsonb,
  target int not null,
  made int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed', 'paused')),
  attempts int not null default 0,
  failures int not null default 0,
  last_error text,
  claimed_at timestamptz,
  batch text not null default 'overnight-2026-11-23',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.content_jobs enable row level security;

create table if not exists public.content_job_log (
  id bigserial primary key,
  job_id bigint references public.content_jobs(id) on delete cascade,
  at timestamptz not null default now(),
  ok boolean not null,
  added int not null default 0,
  rejected int not null default 0,
  ms int,
  note text
);
alter table public.content_job_log enable row level security;

create or replace function public.claim_content_job()
returns setof public.content_jobs
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  select id into v_id from public.content_jobs
  where (status = 'pending' or (status = 'running' and claimed_at < now() - interval '6 minutes'))
    and failures < 5
  order by made::float / greatest(target, 1), id
  limit 1
  for update skip locked;
  if v_id is null then return; end if;
  return query
    update public.content_jobs
    set status = 'running', claimed_at = now(), attempts = attempts + 1, failures = failures + 1, updated_at = now()
    where id = v_id returning *;
end; $$;
revoke all on function public.claim_content_job() from public, anon, authenticated;

-- The function checks callers against the vault secret 'content_cron_secret'
-- (created separately with vault.create_secret, never committed).
create or replace function public.check_content_cron_secret(p_secret text)
returns boolean language sql security definer set search_path = public, vault stable as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'content_cron_secret' and decrypted_secret = p_secret);
$$;
revoke all on function public.check_content_cron_secret(text) from public, anon, authenticated;

grant execute on function public.claim_content_job() to service_role;
grant execute on function public.check_content_cron_secret(text) to service_role;
grant all on public.content_jobs, public.content_job_log to service_role;
grant usage, select on all sequences in schema public to service_role;

create or replace view public.content_job_progress with (security_invoker = true) as
select s.name subject, j.kind, count(*) jobs,
  count(*) filter (where j.status = 'done') done,
  count(*) filter (where j.status = 'failed' or j.failures >= 5) failed,
  sum(j.made) made, sum(j.target) target
from public.content_jobs j join public.subjects s on s.id = j.subject_id
group by s.name, j.kind order by 1, 2;

-- Schedule (migration content_jobs_cron, then widened to 2 calls per tick):
-- every 20 seconds while work is left. Stop with: select cron.unschedule('generate-exam-content');
create extension if not exists pg_cron;
select cron.schedule('generate-exam-content', '20 seconds', $cron$
  select net.http_post(
    url := 'https://mkmzesmzwjcfxtvayvlz.supabase.co/functions/v1/generate-exam-content',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'content_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 170000)
  from generate_series(1, 2)
  where exists (select 1 from public.content_jobs where status in ('pending', 'running') and failures < 5);
$cron$);
