-- RLS tests for the student / parent / practice access model.
--
-- Simulates each actor with set_config('request.jwt.claims') + role
-- 'authenticated' (the same mechanism PostgREST uses). Every check runs in a
-- subtransaction that is always rolled back, so nothing a check writes is kept.
-- A few fixture rows (marked 'RLS TEST') are created at the start and deleted
-- at the end of the same DO block; if anything errors, the whole block rolls
-- back. Redemption fixtures are never committed (their insert trigger sends a
-- push notification), so redemption writes are only tested inside checks.
--
-- Run as the database owner (postgres), e.g. psql -f supabase/tests/rls.sql or
-- via the Supabase SQL editor / MCP. Output: one row per check, pass = true.

drop table if exists pg_temp.rls_results;
create temp table rls_results (n serial, actor text, check_name text, expected text, actual text, pass boolean);

create or replace function pg_temp.chk(p_actor_label text, p_actor uuid, p_name text, p_kind text, p_stmt text, p_expected text)
returns void language plpgsql as $$
declare
  v_actual text;
  v_n bigint;
  v_val text;
begin
  begin
    if p_actor is not null then
      perform set_config('request.jwt.claims', json_build_object('sub', p_actor, 'role', 'authenticated')::text, true);
      perform set_config('role', 'authenticated', true);
    end if;
    if p_kind = 'count' then
      execute format('select count(*) from (%s) x', p_stmt) into v_n;
      v_actual := 'rows=' || v_n;
    elsif p_kind = 'value' then
      execute p_stmt into v_val;
      v_actual := coalesce(v_val, 'null');
    else -- write: insert/update/delete/function call
      execute p_stmt;
      get diagnostics v_n = row_count;
      v_actual := case when v_n > 0 then 'allowed' else 'denied (0 rows)' end;
    end if;
    raise exception 'rls_test_done' using detail = v_actual;
  exception
    when raise_exception then
      if sqlerrm = 'rls_test_done' then
        get stacked diagnostics v_actual = pg_exception_detail;
      else
        v_actual := 'error: ' || sqlerrm;
      end if;
    when insufficient_privilege then v_actual := 'denied';
    when others then v_actual := 'error ' || sqlstate || ': ' || sqlerrm;
  end;

  insert into rls_results (actor, check_name, expected, actual, pass)
  values (p_actor_label, p_name, p_expected, v_actual,
    case
      when p_expected = 'rows>0' then v_actual ~ '^rows=[1-9]'
      when p_expected = 'denied' then v_actual like 'denied%'
      else v_actual = p_expected
    end);
end $$;

-- Two-step helpers: a trigger's or RPC's effects are only visible to a later statement.
create or replace function pg_temp.quiz_then_assignment_status(p_student uuid, p_quiz uuid, p_assignment uuid)
returns text language plpgsql as $$
begin
  insert into quiz_sessions (student_id, quiz_id, quiz_format, question_count, completed_at)
  values (p_student, p_quiz, 'standard', 1, now());
  return (select status from assignments where id = p_assignment);
end $$;

create or replace function pg_temp.tutor_reward_then_ledger(p_session uuid)
returns text language plpgsql as $$
declare v_min int;
begin
  select minutes_awarded into v_min from grade_and_claim_tutor_reward(p_session, 5);
  -- minutes awarded / ledger rows for the session / ledger row owned by the session's student
  return coalesce(v_min::text, 'null') || '/' || (select count(*) from ledger_entries where tutor_session_id = p_session)::text
    || '/' || coalesce((select (l.student_id = t.student_id)::text from ledger_entries l join tutor_sessions t on t.id = l.tutor_session_id where l.tutor_session_id = p_session), 'none');
end $$;

do $$
declare
  v_parent uuid;
  v_james uuid;
  v_practice uuid;
  v_other uuid := '00000000-0000-4000-8000-0000000000aa';  -- not in profiles/links
  v_quiz uuid;
  v_q uuid;
  v_subject uuid;
  v_js uuid;   -- one of James's tutor sessions
  v_ps uuid;   -- practice tutor session fixture
  v_pq uuid;   -- practice quiz session fixture
  v_ja uuid;   -- James assignment fixture
  v_jr bigint; -- one of James's redemption requests
  v_as uuid;   -- assessment fixture
  v_jt uuid;   -- James unclaimed tutor session fixture (reward test only)
  v_free_subject uuid; -- a subject with no lock yet (random uuid on the local replica)
  sid text;
begin
  select id into v_parent from profiles where role = 'parent';
  select l.student_id into v_james from student_links l join profiles p on p.id = l.student_id where l.parent_id = v_parent and not p.is_practice;
  select l.student_id into v_practice from student_links l join profiles p on p.id = l.student_id where l.parent_id = v_parent and p.is_practice;
  if v_parent is null or v_james is null or v_practice is null then
    raise exception 'fixture lookup failed: parent %, james %, practice %', v_parent, v_james, v_practice;
  end if;
  select quiz_id into v_quiz from quiz_sessions where student_id = v_james and quiz_id is not null limit 1;
  select question_id into v_q from student_question_history where student_id = v_james and question_id is not null limit 1;
  select subject_id into v_subject from subject_locks limit 1;
  select id into v_js from tutor_sessions where student_id = v_james limit 1;
  select id into v_jr from redemption_requests where student_id = v_james limit 1;
  if to_regclass('public.subjects') is not null then
    execute 'select id from subjects where id not in (select subject_id from subject_locks) limit 1' into v_free_subject;
  else
    v_free_subject := gen_random_uuid();
  end if;

  -- Fixtures (deleted at the end).
  insert into quiz_sessions (student_id, quiz_id, quiz_format, question_count, score, completed_at)
    values (v_practice, v_quiz, 'standard', 1, 1, now()) returning id into v_pq;
  insert into tutor_sessions (student_id, subtopic_id, message_count, messages)
    values (v_practice, null, 3, '[]') returning id into v_ps;
  insert into tutor_sessions (student_id, subtopic_id, message_count, messages)
    values (v_james, null, 2, '[]') returning id into v_jt;
  insert into ledger_entries (student_id, type, amount_minutes, source) values (v_practice, 'earn', 1, 'RLS TEST');
  insert into assessments (student_id, time_window, status, requested_by) values (v_james, '7d', 'pending', v_parent) returning id into v_as;
  insert into assignments (student_id, type, title, quiz_id, assigned_by, status)
    values (v_james, 'quiz', 'RLS TEST', v_quiz, v_parent, 'pending') returning id into v_ja;

  -- ===== Student (James) =====
  sid := v_james::text;
  perform pg_temp.chk('student', v_james, 'reads own quiz_sessions', 'count', format('select 1 from quiz_sessions where student_id = %L', sid), 'rows>0');
  perform pg_temp.chk('student', v_james, 'reads own question history', 'count', format('select 1 from student_question_history where student_id = %L', sid), 'rows>0');
  perform pg_temp.chk('student', v_james, 'reads own tutor_sessions', 'count', format('select 1 from tutor_sessions where student_id = %L', sid), 'rows>0');
  perform pg_temp.chk('student', v_james, 'reads own ledger', 'count', format('select 1 from ledger_entries where student_id = %L', sid), 'rows>0');
  perform pg_temp.chk('student', v_james, 'reads own redemptions', 'count', format('select 1 from redemption_requests where student_id = %L', sid), 'rows>0');
  perform pg_temp.chk('student', v_james, 'reads own assignments', 'count', format('select 1 from assignments where student_id = %L', sid), 'rows>0');
  perform pg_temp.chk('student', v_james, 'reads own subject locks', 'count', format('select 1 from subject_locks where student_id = %L', sid), 'rows>0');
  perform pg_temp.chk('student', v_james, 'sees only own data in quiz_sessions', 'count', format('select 1 from quiz_sessions where student_id <> %L', sid), 'rows=0');
  perform pg_temp.chk('student', v_james, 'cannot read practice quiz_sessions', 'count', format('select 1 from quiz_sessions where student_id = %L', v_practice), 'rows=0');
  perform pg_temp.chk('student', v_james, 'cannot read practice tutor_sessions', 'count', format('select 1 from tutor_sessions where student_id = %L', v_practice), 'rows=0');
  perform pg_temp.chk('student', v_james, 'cannot read practice ledger', 'count', format('select 1 from ledger_entries where student_id = %L', v_practice), 'rows=0');
  perform pg_temp.chk('student', v_james, 'cannot read parent assessments', 'count', 'select 1 from assessments', 'rows=0');
  perform pg_temp.chk('student', v_james, 'profiles: self + linked parent only', 'count', 'select 1 from profiles', 'rows=2');
  perform pg_temp.chk('student', v_james, 'cannot see practice profile', 'count', format('select 1 from profiles where id = %L', v_practice), 'rows=0');
  perform pg_temp.chk('student', v_james, 'links: only own link', 'count', 'select 1 from student_links', 'rows=1');
  perform pg_temp.chk('student', v_james, 'balance (own) matches ledger', 'value', format('select (get_screen_time_balance(%L::uuid) = (select coalesce(sum(case when type=''earn'' then amount_minutes else -amount_minutes end),0) from ledger_entries where student_id = %L))::text', sid, sid), 'true');
  perform pg_temp.chk('student', v_james, 'can write own quiz_session', 'write', format('insert into quiz_sessions (student_id, quiz_format, question_count) values (%L, ''standard'', 1)', sid), 'allowed');
  perform pg_temp.chk('student', v_james, 'can write own question history', 'write', format('insert into student_question_history (student_id, question_id, answered_correctly) values (%L, %L, true)', sid, v_q), 'allowed');
  perform pg_temp.chk('student', v_james, 'can start own tutor_session', 'write', format('insert into tutor_sessions (student_id, message_count, messages) values (%L, 0, ''[]'')', sid), 'allowed');
  perform pg_temp.chk('student', v_james, 'can update own tutor_session', 'write', format('update tutor_sessions set message_count = message_count where id = %L', v_js), 'allowed');
  perform pg_temp.chk('student', v_james, 'can request redemption (pending)', 'write', format('insert into redemption_requests (student_id, minutes_requested) values (%L, 10)', sid), 'allowed');
  perform pg_temp.chk('student', v_james, 'cannot create pre-approved redemption', 'write', format('insert into redemption_requests (student_id, minutes_requested, status) values (%L, 10, ''approved'')', sid), 'denied');
  perform pg_temp.chk('student', v_james, 'cannot approve own redemption', 'write', format('update redemption_requests set status = ''approved'' where id = %s', v_jr), 'denied');
  perform pg_temp.chk('student', v_james, 'cannot insert ledger credit', 'write', format('insert into ledger_entries (student_id, type, amount_minutes, source) values (%L, ''earn'', 60, ''hack'')', sid), 'denied');
  perform pg_temp.chk('student', v_james, 'cannot create assignment', 'write', format('insert into assignments (student_id, type, title, assigned_by) values (%L, ''quiz'', ''x'', %L)', sid, sid), 'denied');
  perform pg_temp.chk('student', v_james, 'cannot update assignment', 'write', format('update assignments set status = ''completed'' where id = %L', v_ja), 'denied');
  perform pg_temp.chk('student', v_james, 'cannot add subject lock', 'write', format('insert into subject_locks (student_id, subject_id, locked_until) values (%L, %L, now() + interval ''1 day'')', sid, v_subject), 'denied');
  perform pg_temp.chk('student', v_james, 'cannot remove subject lock', 'write', format('delete from subject_locks where student_id = %L', sid), 'denied');
  perform pg_temp.chk('student', v_james, 'cannot write practice quiz_session', 'write', format('insert into quiz_sessions (student_id, quiz_format, question_count) values (%L, ''standard'', 1)', v_practice), 'denied');
  perform pg_temp.chk('student', v_james, 'cannot reset practice data', 'write', format('select reset_practice_data(%L)', v_practice), 'denied');
  perform pg_temp.chk('student', v_james, 'redemption without student_id is rejected', 'write', 'insert into redemption_requests (minutes_requested) values (10)', 'denied');

  -- ===== Parent =====
  perform pg_temp.chk('parent', v_parent, 'reads James quiz_sessions', 'count', format('select 1 from quiz_sessions where student_id = %L', sid), 'rows>0');
  perform pg_temp.chk('parent', v_parent, 'reads James question history', 'count', format('select 1 from student_question_history where student_id = %L', sid), 'rows>0');
  perform pg_temp.chk('parent', v_parent, 'reads James tutor_sessions', 'count', format('select 1 from tutor_sessions where student_id = %L', sid), 'rows>0');
  perform pg_temp.chk('parent', v_parent, 'reads James ledger', 'count', format('select 1 from ledger_entries where student_id = %L', sid), 'rows>0');
  perform pg_temp.chk('parent', v_parent, 'reads James redemptions', 'count', format('select 1 from redemption_requests where student_id = %L', sid), 'rows>0');
  perform pg_temp.chk('parent', v_parent, 'reads James assignments', 'count', format('select 1 from assignments where student_id = %L', sid), 'rows>0');
  perform pg_temp.chk('parent', v_parent, 'reads James assessments', 'count', format('select 1 from assessments where student_id = %L', sid), 'rows>0');
  perform pg_temp.chk('parent', v_parent, 'reads practice tutor_sessions', 'count', format('select 1 from tutor_sessions where student_id = %L', v_practice), 'rows>0');
  perform pg_temp.chk('parent', v_parent, 'reads practice quiz_sessions', 'count', format('select 1 from quiz_sessions where student_id = %L', v_practice), 'rows>0');
  perform pg_temp.chk('parent', v_parent, 'profiles: self + James + practice', 'count', 'select 1 from profiles', 'rows=3');
  perform pg_temp.chk('parent', v_parent, 'balance (James) matches ledger', 'value', format('select (get_screen_time_balance(%L::uuid) = (select coalesce(sum(case when type=''earn'' then amount_minutes else -amount_minutes end),0) from ledger_entries where student_id = %L))::text', sid, sid), 'true');
  perform pg_temp.chk('parent', v_parent, 'cannot write James quiz result', 'write', format('insert into quiz_sessions (student_id, quiz_format, question_count, score) values (%L, ''standard'', 1, 1)', sid), 'denied');
  perform pg_temp.chk('parent', v_parent, 'cannot write James question history', 'write', format('insert into student_question_history (student_id, question_id, answered_correctly) values (%L, %L, true)', sid, v_q), 'denied');
  perform pg_temp.chk('parent', v_parent, 'cannot start tutor session as James', 'write', format('insert into tutor_sessions (student_id, message_count, messages) values (%L, 0, ''[]'')', sid), 'denied');
  perform pg_temp.chk('parent', v_parent, 'cannot update James tutor session', 'write', format('update tutor_sessions set message_count = message_count where id = %L', v_js), 'denied');
  perform pg_temp.chk('parent', v_parent, 'cannot submit written answer as James', 'write', format('insert into fm_attempts (student_id, question_id) values (%L, gen_random_uuid())', sid), 'denied');
  perform pg_temp.chk('parent', v_parent, 'cannot request redemption as James', 'write', format('insert into redemption_requests (student_id, minutes_requested) values (%L, 10)', sid), 'denied');
  perform pg_temp.chk('parent', v_parent, 'cannot write quiz_session under own id', 'write', format('insert into quiz_sessions (student_id, quiz_format, question_count) values (%L, ''standard'', 1)', v_parent), 'denied');
  perform pg_temp.chk('parent', v_parent, 'cannot start tutor session under own id', 'write', format('insert into tutor_sessions (student_id, message_count, messages) values (%L, 0, ''[]'')', v_parent), 'denied');
  perform pg_temp.chk('parent', v_parent, 'practice: can write quiz_session', 'write', format('insert into quiz_sessions (student_id, quiz_format, question_count) values (%L, ''standard'', 1)', v_practice), 'allowed');
  perform pg_temp.chk('parent', v_parent, 'practice: can write question history', 'write', format('insert into student_question_history (student_id, question_id, answered_correctly) values (%L, %L, true)', v_practice, v_q), 'allowed');
  perform pg_temp.chk('parent', v_parent, 'practice: can start tutor session', 'write', format('insert into tutor_sessions (student_id, message_count, messages) values (%L, 0, ''[]'')', v_practice), 'allowed');
  perform pg_temp.chk('parent', v_parent, 'practice: can update tutor session', 'write', format('update tutor_sessions set message_count = message_count where id = %L', v_ps), 'allowed');
  perform pg_temp.chk('parent', v_parent, 'practice: can request redemption', 'write', format('insert into redemption_requests (student_id, minutes_requested) values (%L, 10)', v_practice), 'allowed');
  perform pg_temp.chk('parent', v_parent, 'can assign quiz to James', 'write', format('insert into assignments (student_id, type, title, quiz_id, assigned_by) values (%L, ''quiz'', ''x'', %L, %L)', sid, v_quiz, v_parent), 'allowed');
  perform pg_temp.chk('parent', v_parent, 'cannot assign as someone else', 'write', format('insert into assignments (student_id, type, title, assigned_by) values (%L, ''quiz'', ''x'', %L)', sid, sid), 'denied');
  perform pg_temp.chk('parent', v_parent, 'can update James assignment', 'write', format('update assignments set note = note where id = %L', v_ja), 'allowed');
  perform pg_temp.chk('parent', v_parent, 'can lock a subject for James', 'write', format('insert into subject_locks (student_id, subject_id, locked_until) values (%L, %L, now() + interval ''1 day'')', sid, v_free_subject), 'allowed');
  perform pg_temp.chk('parent', v_parent, 'can remove James subject lock', 'write', format('delete from subject_locks where student_id = %L', sid), 'allowed');
  perform pg_temp.chk('parent', v_parent, 'can decide James redemption', 'write', format('update redemption_requests set resolved_note = resolved_note where id = %s', v_jr), 'allowed');
  perform pg_temp.chk('parent', v_parent, 'can add manual ledger adjustment for James', 'write', format('insert into ledger_entries (student_id, type, amount_minutes, source) values (%L, ''spend'', 5, ''Redemption approved'')', sid), 'allowed');
  perform pg_temp.chk('parent', v_parent, 'can request assessment for James', 'write', format('insert into assessments (student_id, time_window, requested_by) values (%L, ''7d'', %L)', sid, v_parent), 'allowed');
  perform pg_temp.chk('parent', v_parent, 'cannot reset James data', 'write', format('select reset_practice_data(%L)', sid), 'denied');
  perform pg_temp.chk('parent', v_parent, 'can reset practice data', 'value', format('select (reset_practice_data(%L) ->> ''tutor_sessions'')::int > 0', v_practice), 'true');
  perform pg_temp.chk('parent', v_parent, 'assignment without student_id is rejected', 'write', format('insert into assignments (type, title, quiz_id, assigned_by) values (''quiz'', ''x'', %L, %L)', v_quiz, v_parent), 'denied');

  -- ===== Unrelated authenticated user =====
  perform pg_temp.chk('unrelated', v_other, 'sees no quiz_sessions', 'count', 'select 1 from quiz_sessions', 'rows=0');
  perform pg_temp.chk('unrelated', v_other, 'sees no question history', 'count', 'select 1 from student_question_history', 'rows=0');
  perform pg_temp.chk('unrelated', v_other, 'sees no tutor_sessions', 'count', 'select 1 from tutor_sessions', 'rows=0');
  perform pg_temp.chk('unrelated', v_other, 'sees no ledger', 'count', 'select 1 from ledger_entries', 'rows=0');
  perform pg_temp.chk('unrelated', v_other, 'sees no redemptions', 'count', 'select 1 from redemption_requests', 'rows=0');
  perform pg_temp.chk('unrelated', v_other, 'sees no assignments', 'count', 'select 1 from assignments', 'rows=0');
  perform pg_temp.chk('unrelated', v_other, 'sees no subject locks', 'count', 'select 1 from subject_locks', 'rows=0');
  perform pg_temp.chk('unrelated', v_other, 'sees no assessments', 'count', 'select 1 from assessments', 'rows=0');
  perform pg_temp.chk('unrelated', v_other, 'sees no profiles', 'count', 'select 1 from profiles', 'rows=0');
  perform pg_temp.chk('unrelated', v_other, 'sees no links', 'count', 'select 1 from student_links', 'rows=0');
  perform pg_temp.chk('unrelated', v_other, 'cannot write James quiz result', 'write', format('insert into quiz_sessions (student_id, quiz_format, question_count) values (%L, ''standard'', 1)', sid), 'denied');
  perform pg_temp.chk('unrelated', v_other, 'cannot request redemption for James', 'write', format('insert into redemption_requests (student_id, minutes_requested) values (%L, 10)', sid), 'denied');
  perform pg_temp.chk('unrelated', v_other, 'cannot reset practice data', 'write', format('select reset_practice_data(%L)', v_practice), 'denied');

  -- ===== Database behaviour (as owner) =====
  perform pg_temp.chk('system', null, 'practice quiz does not complete James assignment', 'value',
    format('select pg_temp.quiz_then_assignment_status(%L, %L, %L)', v_practice, v_quiz, v_ja), 'pending');
  perform pg_temp.chk('system', null, 'James quiz completes James assignment', 'value',
    format('select pg_temp.quiz_then_assignment_status(%L, %L, %L)', sid, v_quiz, v_ja), 'completed');
  perform pg_temp.chk('system', null, 'practice tutor reward: graded, 0 minutes, no ledger row', 'value',
    format('select pg_temp.tutor_reward_then_ledger(%L)', v_ps), '0/0/none');
  perform pg_temp.chk('system', null, 'James tutor reward credits 5 min, ledger row is James''s', 'value',
    format('select pg_temp.tutor_reward_then_ledger(%L)', v_jt), '5/1/true');

  -- Remove fixtures.
  delete from assignments where id = v_ja;
  delete from assessments where id = v_as;
  delete from ledger_entries where student_id = v_practice and source = 'RLS TEST';
  delete from tutor_sessions where id in (v_ps, v_jt);
  delete from quiz_sessions where id = v_pq;
end $$;

select n, actor, check_name, expected, actual, pass from rls_results order by n;
