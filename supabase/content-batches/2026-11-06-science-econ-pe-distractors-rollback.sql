-- Undo the English Literature distractor rewrites: restore the original
-- options kept in question_option_revisions.old_options.
with restored as (
  update public.questions q
  set option_a = r.old_options->>'A',
      option_b = r.old_options->>'B',
      option_c = r.old_options->>'C',
      option_d = r.old_options->>'D'
  from public.question_option_revisions r
  where r.question_id = q.id and r.batch in ('biology-2026-11','chemistry-2026-11','economics-2026-11','physical-education-2026-11','physics-2026-11') and r.status = 'applied'
  returning r.id
)
update public.question_option_revisions r
set status = 'rolled_back'
from restored where restored.id = r.id;
