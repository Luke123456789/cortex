-- Put the reviewed Biology, Chemistry, Economics, PE and Physics distractor rewrites live.
-- Only rows still in 'draft' (passed the quality check and the independent
-- answer check) are applied; the correct option is unchanged by construction
-- and checked again here. Flagged questions keep their old options.
with applied as (
  update public.questions q
  set option_a = r.new_options->>'A',
      option_b = r.new_options->>'B',
      option_c = r.new_options->>'C',
      option_d = r.new_options->>'D'
  from public.question_option_revisions r
  where r.question_id = q.id
    and r.batch in ('biology-2026-11','chemistry-2026-11','economics-2026-11','physical-education-2026-11','physics-2026-11')
    and r.status = 'draft'
    and upper(q.correct_option) = r.correct_option
    and r.new_options->>r.correct_option = r.old_options->>r.correct_option
    -- Only if the live options are still the ones the draft was made from.
    and q.option_a = r.old_options->>'A' and q.option_b = r.old_options->>'B'
    and q.option_c = r.old_options->>'C' and q.option_d = r.old_options->>'D'
  returning r.id
)
update public.question_option_revisions r
set status = 'applied', applied_at = now()
from applied where applied.id = r.id;
