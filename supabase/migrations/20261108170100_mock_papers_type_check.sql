-- Mock papers, part 2: allow the new assignment type. Replaces the type
-- check and adds one requiring a paper for mock_paper assignments; also
-- removes the default public execute on the paper functions (they check the
-- caller anyway).
alter table public.assignments drop constraint if exists assignments_type_check;
alter table public.assignments add constraint assignments_type_check
  check (type = any (array['quiz', 'tutor_session', 'written_test', 'past_paper', 'mock_paper']));

alter table public.assignments drop constraint if exists assignments_mock_paper_ref;
alter table public.assignments add constraint assignments_mock_paper_ref
  check (type <> 'mock_paper' or paper_ref is not null);

revoke all on function public.start_paper(uuid) from public, anon;
revoke all on function public.finish_paper(uuid) from public, anon;
grant execute on function public.start_paper(uuid) to authenticated;
grant execute on function public.finish_paper(uuid) to authenticated;
