-- Cortex v2 schema
-- Single reward mechanism: minutes of screen time. No XP, no separate currencies.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('parent', 'student')),
  display_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "users can view own profile" on profiles;
create policy "users can view own profile" on profiles
  for select
  to authenticated
  using (auth.uid() = id);

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
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  role text not null check (role in ('parent', 'student'))
);

-- Row Level Security: role comes from the profiles table, which is only
-- ever populated by Dave directly in the SQL editor — there's no public
-- sign-up flow, so 'which role am I' can't be spoofed by a client.
alter table ledger_entries enable row level security;
alter table redemption_requests enable row level security;
alter table push_subscriptions enable row level security;

drop policy if exists "anon full access - ledger" on ledger_entries;
drop policy if exists "anon full access - redemption" on redemption_requests;
drop policy if exists "anon full access - push subscriptions" on push_subscriptions;

create policy "authenticated can read ledger" on ledger_entries
  for select
  to authenticated
  using (true);

create policy "student can log earn entries" on ledger_entries
  for insert
  to authenticated
  with check (
    type = 'earn'
    and exists (select 1 from profiles where id = auth.uid() and role = 'student')
  );

create policy "parent can log spend entries" on ledger_entries
  for insert
  to authenticated
  with check (
    type = 'spend'
    and exists (select 1 from profiles where id = auth.uid() and role = 'parent')
  );

create policy "authenticated can read redemption requests" on redemption_requests
  for select
  to authenticated
  using (true);

create policy "student can create redemption requests" on redemption_requests
  for insert
  to authenticated
  with check (
    status = 'pending'
    and exists (select 1 from profiles where id = auth.uid() and role = 'student')
  );

create policy "parent can resolve redemption requests" on redemption_requests
  for update
  to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'parent'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'parent'));

create policy "users manage own push subscription" on push_subscriptions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
