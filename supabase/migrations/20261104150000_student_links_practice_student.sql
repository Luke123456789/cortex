-- Step 1a: student_links, profiles.is_practice, and the parent's practice student.
--
-- The practice student needs an auth.users row so foreign keys to profiles
-- (and profiles -> auth.users) hold. This session has no service-role key or
-- Supabase CLI, so instead of the Admin API the user is created directly in
-- auth.users: random bcrypt password nobody knows, no confirmed email, and
-- banned until 9999 so it can never sign in. The parent acts as it through
-- the app's Practice mode, never by logging in.
--
-- Idempotent: safe to re-run. James and the parent are found by role, never
-- hard-coded; the migration aborts unless there is exactly one of each.
begin;

alter table public.profiles add column if not exists is_practice boolean not null default false;

create table if not exists public.student_links (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  relationship text not null default 'parent' check (relationship = 'parent'),
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id),
  check (parent_id <> student_id)
);
create index if not exists student_links_student_idx on public.student_links (student_id);

alter table public.student_links enable row level security;
drop policy if exists "linked users can read their links" on public.student_links;
create policy "linked users can read their links" on public.student_links
  for select to authenticated
  using (parent_id = auth.uid() or student_id = auth.uid());
-- No insert/update/delete policies: links are managed by migrations / service role.

do $$
declare
  v_parent uuid;
  v_james uuid;
  v_practice uuid;
  v_n int;
begin
  select count(*) into v_n from public.profiles where role = 'parent';
  if v_n <> 1 then raise exception 'expected exactly one parent profile, found %', v_n; end if;
  select id into v_parent from public.profiles where role = 'parent';

  select count(*) into v_n from public.profiles where role = 'student' and not is_practice;
  if v_n <> 1 then raise exception 'expected exactly one real student profile, found %', v_n; end if;
  select id into v_james from public.profiles where role = 'student' and not is_practice;

  -- Practice student for this parent (reuse if it already exists).
  select p.id into v_practice
  from public.profiles p join public.student_links l on l.student_id = p.id
  where p.is_practice and l.parent_id = v_parent
  limit 1;

  if v_practice is null then
    v_practice := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, banned_until)
    values ('00000000-0000-0000-0000-000000000000', v_practice, 'authenticated', 'authenticated',
            'practice+' || v_parent || '@cortex.invalid',
            extensions.crypt(encode(extensions.gen_random_bytes(32), 'hex'), extensions.gen_salt('bf')),
            '{"provider": "email", "providers": ["email"], "practice": true}'::jsonb,
            '{}'::jsonb, now(), now(), '9999-12-31'::timestamptz);
    insert into public.profiles (id, role, display_name, is_practice)
    values (v_practice, 'student', 'Practice', true);
  end if;

  insert into public.student_links (parent_id, student_id) values (v_parent, v_james)
  on conflict do nothing;
  insert into public.student_links (parent_id, student_id) values (v_parent, v_practice)
  on conflict do nothing;
end $$;

commit;
