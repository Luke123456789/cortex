-- Rewritten wrong answers (distractors) for multiple-choice questions, staged
-- for review before they replace the live options. The correct option is
-- never changed. old_options keeps the originals so a batch can be rolled
-- back. Service role only (RLS on, no policies).
create table if not exists public.question_option_revisions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  subject text not null,
  batch text not null,
  correct_option char(1) not null check (correct_option in ('A', 'B', 'C', 'D')),
  old_options jsonb not null,
  new_options jsonb not null,
  checks jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'flagged', 'applied', 'rejected', 'rolled_back')),
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

create index if not exists question_option_revisions_question on public.question_option_revisions (question_id);
create index if not exists question_option_revisions_batch on public.question_option_revisions (batch, status);

alter table public.question_option_revisions enable row level security;
