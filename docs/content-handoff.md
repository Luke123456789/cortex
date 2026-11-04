# Handoff: James's GCSE content in Cortex

Read this whole file before doing anything. Supabase project: `mkmzesmzwjcfxtvayvlz`.

## Branch

All work so far is on **`claude/bold-bell-m46y8o`** (it includes the earlier
`claude/cortex-tutor-remove-voice-3ymu54` commits). Start a fresh session by
fetching it and continuing on it, or on whatever branch the new session is given
with this branch merged in:

```
git fetch origin claude/bold-bell-m46y8o && git merge --ff-only origin/claude/bold-bell-m46y8o
```

`main` has only the app as deployed, plus `.claude/settings.json`, which allows
`mcp__Supabase__apply_migration` without a prompt. **App code changes on this
branch are not on `main` yet** (see "App fixes" below). Ask Luke before merging to `main`.

## James's subjects and exam boards (confirmed from school mock sheets)

| Subject | Board / spec | Status |
|---|---|---|
| Biology | AQA 8461 | Existing content, 10 topics |
| Chemistry | AQA 8462 | **Done**: C1–C5 added (100 Qs); C6–C10 now have subtopics |
| Physics | AQA 8463 | **In progress**: P1–P3 applied, P4–P8 still to apply (see below) |
| Business | **WJEC Eduqas C710** (not AQA) | Next after Physics |
| PE | OCR J587 | Remap from AQA; needs Luke's approval of the mapping first |
| English Language | AQA 8700 | Skills-based (see original brief) |
| History | **Pearson Edexcel 1HI0** (not AQA) | Units known (below); Paper 3 option unknown |
| Maths | AQA 8300 **Higher** | After the above |
| Economics | AQA 8136 | Existing content |
| English Literature | AQA 8702 | Existing; 46 subtopics have no `spec_ref` |

**Business mock topics (Eduqas):** cash flow, stakeholders, business growth,
business terminology, product life cycle, competition, revenue/costs/profit,
income statements, ratios, market research, business data, average rate of
return, goods and services, entrepreneurs, external influences, percentage
change, promotion, technology, business ownership, e-commerce, quality,
legislation, business software, economic factors, motivation. Exam skills: key
terms, use the context, analyse impacts, evaluate ("what might it depend on?").

**History (Edexcel) mock units:**
- Paper 1: Crime and punishment in Britain c1000–present, with Whitechapel
  c1870–c1900 (crime, policing and the inner city).
- Paper 2 period study: P3 The American West c1835–c1895.
- Paper 2 British depth study: B1 Anglo-Saxon and Norman England c1060–88.
- Paper 3 modern depth study: **unknown, ask Luke.**

## Order of work (from Luke)

Finish and check each subject before the next. After each one, show Luke the
topic list and 5 sample questions.

1. **Physics**: apply P4–P8, verify, show Luke. ← resume here
2. **Business** (Eduqas C710): build the spec file from the Eduqas spec, using
   the mock topic list above as a checklist.
3. **PE → OCR J587**: map every existing question onto Applied Anatomy and
   Physiology, Physical Training, Socio-cultural Issues, Sports Psychology, and
   Health, Fitness and Well-being. Set `active = false` on AQA-only questions
   (including the whole "Use of Data" topic). **Never delete** (quiz history).
   Check against the real OCR J587 spec. **Show Luke the mapping table and
   wait for approval before applying.** Also update the PE `subjects` row
   (currently AQA 8582) and, in the same migration, recompute
   `quizzes.question_count` for affected quizzes as the count of *active*
   questions. The app now hides quizzes with a count of 0.
4. **English Language** (AQA 8700): skills-based; only use MCQs for what an MCQ
   can genuinely test.
5. **History** (Edexcel 1HI0) and **Maths** (AQA 8300 Higher).

## How content is made and applied

There is **no `ANTHROPIC_API_KEY`** in these sessions, so questions are
hand-written in `scripts/authored/<spec>.json` and turned into SQL by the
generator:

```
node scripts/generate-subject.mjs --spec scripts/specs/<spec>.json --authored scripts/authored/<spec>.json
```

It writes `supabase/content-batches/<date>-<board>-<code>-<subject>-<batch8>.sql`,
`.rollback.sql` and `.report.json` (with a `checksum_sql` query). Notes:
- The database creates IDs and content hashes. Topics, subtopics and quizzes
  are referenced by name, so the file holds no random strings except the batch id.
- Correct answers are balanced evenly across A–D within each batch.
- Questions are deduped against the whole `questions` table by normalised text.
- Each new topic gets quizzes of up to 20 questions (`Quiz N`, 168h cooldown).
- Difficulty mapping: easy/medium → `foundation`, hard → `higher`. Skill
  mapping: recall → recall/AO1, application → applied/AO2, analysis →
  applied/AO3. Calculations → `calculation`. Aim for about 15–20% hard.

**Dry run first.** Postgres 16 is installed at `/usr/lib/postgresql/16/bin`.
Start a throwaway server as the `postgres` user in `/tmp/cortex-pgtest` (it
must be readable by `postgres`, so the scratchpad won't work). Load a minimal
copy of the schema (`scripts/content-test-schema.sql`), run the batch with
`psql -1`, check the counts, run the rollback, then re-run the batch:

```
B=/usr/lib/postgresql/16/bin; mkdir -p /tmp/cortex-pgtest && chown postgres /tmp/cortex-pgtest
su postgres -s /bin/bash -c "$B/initdb -D /tmp/cortex-pgtest/data && $B/pg_ctl -D /tmp/cortex-pgtest/data -o '-k /tmp/cortex-pgtest -p 5499 -c listen_addresses=' -l /tmp/cortex-pgtest/log start"
psql -h /tmp/cortex-pgtest -p 5499 -U postgres -v ON_ERROR_STOP=1 -f scripts/content-test-schema.sql
```

**Apply** with the Supabase MCP `apply_migration`, **one migration per topic**:
split the batch file at each `insert into topics` line with awk. The first
part also carries the `insert into subjects` header. Name migrations like
`physics_p4_atomic_structure`.

**Verify** after applying, per topic, by comparing with the local dry run:

```sql
select t.spec_ref, count(q.id) n, md5(string_agg(concat_ws('|', st.name, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.explanation, q.difficulty, q.question_type, q.ao_weighting, qq.position), E'\n' order by qq.position)) ck
from questions q join topics t on t.id=q.topic_id join subtopics st on st.id=q.subtopic_id join quiz_questions qq on qq.question_id=q.id
where q.generation_batch_id='<batch id>' group by t.spec_ref order by 1;
```

Commit the spec, authored JSON and batch files after each subject.

## Physics: exactly where it stopped

Batch **`f4523abc-cc13-426c-9eed-deef288ff03d`**, file
`supabase/content-batches/2026-11-04-aqa-8463-physics-f4523abc.sql`
(164 questions; P5 has 24 split into two quizzes of 12).

| Topic | Migration | Status | Expected checksum |
|---|---|---|---|
| P1 Energy | `physics_p1_energy` | applied, verified | 8bd623da08350dc1f96cfb591363964d |
| P2 Electricity | `physics_p2_electricity` | applied, verified | 186e4030c44da9e54f779e09e0093a50 |
| P3 Particle Model of Matter | `physics_p3_particle_model` | applied, verified | c242bf072a2cc8b9b73de13d278ac68a |
| P4 Atomic Structure | — | **to apply** | 98605cdcaf44226b14d7af2c5c2abb97 |
| P5 Forces | — | **to apply** | 854039f7a1092b6985a08629fe2e99d8 |
| P6 Waves | — | **to apply** | b41e04b5b145169963f79aa44e41fdf5 |
| P7 Magnetism and Electromagnetism | — | **to apply** | 3f395c0548c4bb6ecb4a5354a9387fa4 |
| P8 Space Physics | — | **to apply** | d99617901db4e9e7bb25ee0009912f98 |

Do **not** regenerate the Physics batch: a rerun shuffles answer letters and
makes a new batch id, which won't match the rows already applied. Apply P4–P8
from the committed `.sql` file as-is. Split it with:

```
awk -v d=/tmp/cortex-pgtest 'BEGIN{n=0} /^insert into topics/{n++} {print > (d "/phys" n ".sql")}' supabase/content-batches/2026-11-04-aqa-8463-physics-f4523abc.sql
```

`phys4.sql` … `phys8.sql` are P4…P8. Each is one migration. Then verify all
eight checksums, and show Luke the topic list and 5 sample questions.

## Database changes already made this round

- Migrations `chemistry_c1_atomic_structure` … `chemistry_c5_energy_changes`
  (batch `16300e7d`, 100 Qs, verified by checksum).
- `chemistry_c6_c10_subtopics`: 17 subtopics for the existing C6–C10, all 80
  questions linked (rollback in `content-batches/…c6-c10-subtopics.rollback.sql`).
- `topic_question_counts_view`: per-topic active question counts
  (security_invoker), used by the app.
- Edge functions deployed: `tutor-chat` v11 and `tutor-plan` v7 (EXAM_BOARDS
  now covers every subject above with the corrected boards);
  `grade-quiz-session` v3 (skips inactive questions).

## App fixes on this branch, not yet on `main` (needs Luke's OK to deploy)

From the step 3 audit ("check the app can handle the new subjects: subject and
topic pickers, the parent's subject locks and assignment screens, the tutor,
and the progress assessment"):
- **Row-cap bug (important):** `useQuizCatalog` counted questions by fetching
  every active question. The API returns at most 1000 rows and there are now
  ~1500, so topics and subjects could vanish from the student's quiz and tutor
  pickers. It now reads `topic_question_counts`.
- `useAssignableCatalog` hides quizzes with `question_count = 0`.
- `TutorChat` no longer keeps the previous topic's subtopic when the new
  topic has none, and shows a message instead.
- Grader fix is already live (edge function), with a unit test.

Audit results that needed no change: subject locks and the assessment both
list all subjects generically. Findings to tell Luke about but not fixed:
- There are **no written-test questions** (`fm_exam_questions`) for any
  subject, so the "Written test" assignment type is always empty.
- Assessment queries could also hit the 1000-row cap over a long time window,
  once there are lots of quiz sessions.

## Open questions for Luke

1. OK to merge the app fixes to `main` (deploys the app)?
2. History Paper 3 (modern depth study) option.
3. PE mapping table, when it's ready (needs approval).

## Git

Commit with clear messages ending with the session's attribution lines. Push to
the session's designated branch. Content goes to the database via migrations;
push to `main` only for app changes Luke approves.
