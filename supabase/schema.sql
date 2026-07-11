-- Cortex v2 schema
-- Single reward mechanism: minutes of screen time. No XP, no separate currencies.

create table if not exists ledger_entries (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  type text not null check (type in ('earn', 'spend')),
  amount_minutes int not null check (amount_minutes > 0),
  source text not null,          -- e.g. 'Quickfire quiz', 'Redemption approved'
  note text                      -- e.g. '9/10 correct'
);

create table if not exists redemption_requests (
  id bigint generated always as identity primary key,
  requested_at timestamptz not null default now(),
  minutes_requested int not null check (minutes_requested > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  resolved_at timestamptz,
  resolved_note text
);

create table if not exists push_subscriptions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null
);

alter table push_subscriptions enable row level security;

create policy "anon full access - push subscriptions" on push_subscriptions
  for all using (true) with check (true);

-- Row Level Security: locked down by default. Since this is a single-family
-- app with no auth yet, start with the anon key allowed to read/write
-- everything and tighten this once Supabase Auth is wired in for James and Dave.
alter table ledger_entries enable row level security;
alter table redemption_requests enable row level security;

create policy "anon full access - ledger" on ledger_entries
  for all using (true) with check (true);

create policy "anon full access - redemption" on redemption_requests
  for all using (true) with check (true);

-- TODO once auth exists: replace the two policies above with role-based ones,
-- e.g. student can insert 'earn' entries and redemption_requests, only a
-- parent role can insert 'spend' entries or update redemption_requests.
