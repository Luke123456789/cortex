# Handoff: adding James's GCSE subjects to Cortex

Read this whole file before doing anything. It carries over the state of an
earlier session that could not run the generator (no API key there).

Supabase project: `mkmzesmzwjcfxtvayvlz`. Work on branch
`claude/cortex-tutor-remove-voice-3ymu54`.

## The request (from Luke)

James's subjects: Biology, Chemistry, Physics (separate sciences), History,
PE, Business, Economics, English Literature, English Language, Maths. All AQA
except PE, which is **OCR J587**.

Do the subjects **in this order, finishing and checking each one before the
next**. After each subject, show Luke the topic list and 5 sample questions.

a. **Chemistry (AQA 8462)**: add the 5 missing topics (Atomic Structure and
   the Periodic Table; Bonding, Structure and Properties; Quantitative
   Chemistry; Chemical Changes; Energy Changes). Leave the existing 5 topics
   (C6–C10) alone.
b. **Physics (AQA 8463)**: all topics, separate-science content, including
   Space Physics.
c. **Business (AQA 8132)**.
d. **PE: remap to OCR J587.** Map every existing question onto the OCR
   structure: Applied Anatomy and Physiology, Physical Training, Socio-cultural
   Issues, Sports Psychology, Health, Fitness and Well-being. Set
   `active = false` on anything AQA-only (including the whole "Use of Data in
   Physical Activity & Sport" topic). **Never delete**: these questions are
   linked to James's quiz history. Fill OCR gaps with new questions.
   **Show Luke the mapping and get approval before applying it.**
e. **English Language (AQA 8700)**: no set texts, so build it around skills:
   language and structural techniques, question types and command words for
   Papers 1 and 2, inference, evaluation, comparing viewpoints, writing for
   different audiences and purposes. Only use MCQs for things an MCQ can
   genuinely test.
f. **History (AQA 8145) and Maths (AQA 8300): STOP and ask Luke first.**
   History depends on which period study, wider world depth study, thematic
   study and British depth study the school teaches; Maths depends on Higher
   vs Foundation tier. Do not guess either.

Step 3 of the request ("check that the app can handle the new subjects: the
subject and topic pickers, the parent's subject…") was **cut off**. Ask Luke
for the rest.

## What's already done

- `scripts/generate-subject.mjs`: the generator (there was no existing one).
  It generates questions per subtopic through a forced `submit_questions` tool
  call (model `claude-sonnet-5`, same as the edge functions), then runs a
  separate blind verification call and drops any question the verifier
  answers differently or flags as ambiguous, refilling up to 3 rounds. It
  dedupes on `content_hash` and writes three files to
  `supabase/content-batches/`: a `.sql` batch (one `generation_batch_id`), a
  `.rollback.sql` and a `.report.json` of dropped questions. It does **not**
  write to the database.
  Run: `node scripts/generate-subject.mjs --spec scripts/specs/<file>.json`
  (needs `ANTHROPIC_API_KEY`).
- `scripts/specs/aqa-8462-chemistry.json`: the 5 missing Chemistry topics
  (C1–C5, Paper 1) with 25 subtopics and AQA spec refs.
- `test/generate-subject.test.js`: unit tests (`npm test`).

**Applying a batch:** review the `.sql` and `.report.json`, then apply it with
the Supabase MCP `apply_migration` (that's how all existing content went in,
as migrations like `biology_questions_cell_biology`). Commit the batch files.

## Findings about the existing data

- All existing content was hand-written SQL in migrations.
  `generation_batch_id` and `content_hash` are null on every existing row.
  The generator's SQL dedupes against old rows by hashing `question_text` in
  SQL (checked: the SQL and JS hashes match).
- Check constraints: `difficulty` in (foundation, higher); `question_type` in
  (recall, applied, calculation); `ao_weighting` in (AO1, AO2, AO3). The
  generator maps easy and medium to foundation, hard to higher; recall to
  recall/AO1, application to applied/AO2, analysis to applied/AO3 (existing
  content is ~62% foundation). Luke has been told this.
- Quizzes: questions reach the student through `quizzes`/`quiz_questions`
  ("Quiz N", ≤20 questions, `cooldown_hours` 168). The generator creates
  quizzes for **new** topics only. Adding questions to an **existing** topic
  (e.g. PE gap fill) needs quiz rows added separately.
- Pickers (`useQuizCatalog`) hide subjects/topics with no `active` questions.
- Chemistry's existing 5 topics have **0 subtopics** and their 80 questions
  have no `subtopic_id`, so the tutor can't start a session on them.
- English Literature's 46 subtopics have no `spec_ref`.
- PE: 10 AQA topics, 38 subtopics, 200 questions, **none with a
  subtopic_id**. Topics 1–7 have quiz history. `topics` has no `active`
  column, only `questions` does.
- Things the app doesn't handle (for step 3): `PlayQuiz.jsx` and the
  `grade-quiz-session` edge function read questions via `quiz_questions`
  without filtering `active`, so deactivated PE questions would still show up
  in old quizzes. `useAssignableCatalog` lists quizzes regardless of active
  questions.
- The tutor-chat and tutor-plan edge functions have an `EXAM_BOARDS` map that
  says PE is "AQA GCSE Physical Education (8582)" and lacks Physics, Business
  and English Language. Fixing it means redeploying both. **Ask Luke before
  redeploying**; this was asked, with no answer yet.

## PE mapping: work in progress

The previous session had read all 200 PE question texts and started drafting
the AQA-to-OCR mapping, but had not finished checking it against the real OCR
J587 specification. Re-pull the questions (query `questions` joined to
`topics` for subject 'Physical Education') and check each against the OCR
J587 spec from ocr.org.uk, not from memory. Likely AQA-only candidates to
verify: personality types (introvert/extrovert), aggression, inverted-U and
arousal, motivation, the information processing model, somatotypes, EPOC,
hooliganism and all-seater stadia, "contract to compete", technology in
sport, data types (qualitative/quantitative), and the whole Use of Data topic.
Present the mapping as a table and wait for approval.

## Open questions for Luke

1. The rest of step 3 (it was cut off).
2. OK to update `EXAM_BOARDS` and redeploy tutor-chat and tutor-plan?
3. (Later) History options and Maths tier.

## Git

- Commit with clear messages; end commits with the attribution lines the
  session gives you.
- Push to `claude/cortex-tutor-remove-voice-3ymu54`. Content changes go
  straight to the database via migrations; push to `main` only for app code
  changes Luke wants deployed.

## Progress log

### 2026-11-04: Chemistry C1–C5 done
- No API key in this session either, so the generator gained `--authored <file.json>`:
  questions are hand-written in `scripts/authored/<spec>.json` (same shape as the
  submit_questions tool output) and the script builds the SQL, rollback and report.
- SQL format changed: IDs and content hashes are made by the database, and
  topics/subtopics/quizzes are referenced by name, so a batch has nothing random
  in it except the batch id. Answer letters are balanced across A–D per batch.
- `.report.json` carries a checksum and a `checksum_sql` query; run it after applying
  and compare. Batch `16300e7d` was applied as five migrations
  (`chemistry_c1_atomic_structure` … `chemistry_c5_energy_changes`) and every topic
  matched its local checksum.
- Dry runs: `/usr/lib/postgresql/16/bin` exists in the container, so the batch and its
  rollback were tested on a throwaway local Postgres first.

### 2026-11-04: exam boards corrected from school mock sheets
- **History is Pearson Edexcel GCSE (9-1) History (1HI0), not AQA.** Mock (Year 11, Nov) covers:
  - Paper 1 thematic + historic environment: Crime and punishment in Britain c1000–present,
    with Whitechapel c1870–c1900: crime, policing and the inner city.
  - Paper 2 period study: P3 The American West c1835–c1895.
  - Paper 2 British depth study: B1 Anglo-Saxon and Norman England c1060–88.
  - Paper 3 (modern depth study) option still unknown.
- **Business is WJEC Eduqas GCSE (9-1) Business (C710), not AQA 8132.** Mock topic list:
  cash flow, stakeholders, business growth, terminology, product life cycle, competition,
  revenue/costs/profit, income statements, ratios, market research, business data, ARR,
  goods and services, entrepreneurs, external influences, percentage change, promotion,
  technology, ownership, e-commerce, quality, legislation, business software, economic
  factors, motivation.
- Maths: AQA 8300 **Higher**.
- EXAM_BOARDS updated and deployed (tutor-chat v11, tutor-plan v7).

### 2026-11-04: Physics in progress
- Batch `f4523abc` (164 questions, P1–P8) built and dry-run locally; checksums per topic:
  P1 8bd623da… P2 186e4030… P3 c242bf07… P4 98605cdc… P5 854039f7… P6 b41e04b5… P7 3f395c05… P8 d9961790…
- Applied one migration per topic (`physics_p1_energy`, …). Check which are applied with
  list_migrations; the remaining parts are the `insert into topics` sections of the .sql file.
- App fixes on this branch (not yet on main): catalog row cap (topic_question_counts view,
  applied), grader skips inactive questions (grade-quiz-session v3, deployed), empty quizzes
  hidden in Assign work, tutor stale-subtopic fix. Chemistry C6–C10 now have subtopics.
