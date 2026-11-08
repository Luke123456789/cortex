# Cortex responsive UI overhaul — handoff

Branch: `claude/lucid-euler-o5daxh` (push here per stage; push to `main` only at the very end).
Stage (a) is done: commit `eb5b865`. Stages (b), (c), (d) remain.

## The brief (from Luke, unchanged)

Make Cortex work properly on a desktop as well as a phone. Keep the identity:
paper/ink/brass palette and CSS variables in `src/styles/theme.css`, the
Special Elite wordmark, IBM Plex Mono for labels and data, Space Grotesk for
body, the "tear" dividers and the card style. Layout and structure overhaul,
not a rebrand. No Tailwind, no component library.

1. **Styling foundation**: inline `style={{}}` → CSS Modules
   (`Component.module.css` next to each component) plus shared classes in
   `src/styles/`. Inline only for genuinely runtime values (progress widths
   etc.). Tokens in theme.css, fluid type with `clamp()`. Breakpoints: phone
   < 640, tablet 640–1023, desktop ≥ 1024, mobile-first. No `.device` frame.
2. **Shell and navigation**: phone = sticky header (wordmark, mode selector,
   balance) + bottom tab bar (Home, Quizzes, Tutor, Assignments, Activity)
   with safe-area insets; tablet/desktop = left sidebar (collapsible to icons
   on tablet). Main column max ~720px for reading/chat pages, wider for
   dashboards. Parent mode nav: Overview, Assign work, Subject locks,
   Redemptions, Tutor transcripts, Assessment (room for Goals/Reports later).
   Active route highlighting; `<nav>`, `<main>`, `<header>` landmarks.
3. **Pages**: use desktop space properly, don't just stretch the phone layout.
   - Home: one column on phone; desktop dashboard grid (balance + exam
     countdown, current assignments, challenges, recent activity).
   - Quiz play (PlayQuiz, Quiz): centred card at reading width; desktop
     keyboard shortcuts A–D / 1–4 to pick, Enter to submit/next, with a small
     hint; big tap targets on phone.
   - Quiz select and assignments: list on phone, card grid on desktop, with
     subject filtering.
   - Tutor (TutorChat): desktop two columns — chat left, side panel right
     (subject, subtopic, learning outcomes from the lesson plan, "Finish
     session" button). Phone: panel becomes a "Lesson outline" drawer; input
     fixed at the bottom and handles the on-screen keyboard. Desktop: Enter
     sends, Shift+Enter new line.
   - Written answers (fm_attempts): see "Decisions" — does not exist yet.
   - Activity, ledger, redemptions, tutor transcripts: stacked cards on phone,
     real tables on desktop where useful, sticky headers.
   - Parent pages: sensible form widths; assign-work picker and selection side
     by side on desktop.
   - Login: centred at every size.
   - Modals (RedeemModal etc.): bottom sheet on phone, centred dialog on
     desktop, focus trapped, Escape closes.
4. **Quality**: visible focus, full keyboard use, WCAG AA contrast (check
   `--ink-faint` on `--paper` and darken if it fails), labelled inputs and
   buttons, `prefers-reduced-motion`. No horizontal page scroll anywhere from
   320 to 1920px (wide content scrolls in its own container). PWA install
   still works; manifest colours still match.
5. **Process**: stages with a commit each — (a) foundation + shell,
   (b) student pages, (c) parent pages, (d) accessibility pass. After each
   stage: `npm run build`, screenshots of every changed page at 375 / 768 /
   1440 via Playwright, **show Luke the screenshots and stop for review
   before the next stage**. No behaviour changes: data fetching, edge
   function calls, the acting-as logic and RLS-dependent flows must work
   exactly as before. Bugs found along the way: list them, don't fix them in
   this work. At the very end push to `main` and report the commit hashes.

## Decisions already made

- **Screenshots use live data**, signed in as the parent. Luke chose this over
  mock data. Credentials: env vars `CORTEX_PARENT_EMAIL` and
  `CORTEX_PARENT_PASSWORD` (environment secrets). Never print them.
- The practice student cannot sign in (banned, random password). "As the
  practice student" means the parent in the student view; `useAuth` sets
  `studentId` to the practice student there. Never use James's account.
- Keep the header mode selector (`RoleSwitch`, now a Student | Parent
  segmented control) and the **Practice mode** banner on Home (with "Reset
  practice data"). There is no "view-only" banner in the code.
- **Written answers**: there is no fm_attempts UI (just a "Coming soon"
  tile). Building upload / typed answers would be new behaviour — left out
  unless Luke says otherwise.
- **`/quizzes` (QuizSelect) is a stub**: quizzes are parent-assigned and
  played from Assignments, so there's nothing to filter. The Quizzes tab
  points at it for now; flag again in stage (b).
- On the collapsed tablet sidebar the mode switch is hidden until expanded.
- Below 480px the header "Practice" badge is hidden to keep one row.

## What stage (a) built (commit eb5b865)

- `src/styles/theme.css`: tokens (spacing, `--text-*` clamp scale, radii,
  shadows, `--content-reading` 720px, `--content-wide` 1200px, sidebar/header/
  tab-bar sizes, `--tap-min` 44px), reduced motion, focus ring. Keeps the old
  global `* { margin:0; padding:0 }` reset because pages rely on it.
- `src/styles/layout.css`: `.page`, `.page--wide`, `.page--centered`,
  `.stack`, `.cluster`, `.back-link`, `.visually-hidden`, `.scroll-x`.
  **Legacy** `.device` / `.screen` are now plain containers; remove them from
  each page as it moves to its own CSS Module in stages (b)/(c).
- `src/components/shell/`: `AppShell.jsx` (+ module CSS), `navConfig.js`
  (STUDENT_NAV / PARENT_NAV, `isActive`, `isParentPath`), `Icon.jsx`.
  All signed-in routes are children of the shell in `src/App.jsx`.
- `useBalance(studentId)` in `src/hooks/useLedger.js` for the shell (own
  realtime channel name).
- `/parent/locks` → `src/pages/SubjectLocksPage.jsx`. SubjectLocks is still
  also on the parent Overview — decide in stage (c).
- Per-page wordmark / sign-out / back rows removed; Quiz and PlayQuiz keep a
  `.back-link`. Login is a centred card (`Login.module.css`).
- `index.html`: `viewport-fit=cover`.
- Pages still carry their old inline styles — converting them is stages b/c.

## Running the screenshots

1. Create `.env.local` (git-ignored) with `VITE_SUPABASE_URL=https://mkmzesmzwjcfxtvayvlz.supabase.co`
   and `VITE_SUPABASE_ANON_KEY=<publishable key>`. Get the key with
   `curl -sS https://api.supabase.com/v1/projects/mkmzesmzwjcfxtvayvlz/api-keys -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"`
   (the `anon` / publishable one), without echoing it.
2. `npm run screenshots` (builds, serves with `vite preview`, signs in, writes
   `screenshots/<page>-<phone|tablet|desktop>.png`, and reports any
   horizontal overflow at 320–1920px or page errors). `SHOTS_PAGES=a,b`
   limits pages; `SHOTS_TOPIC_ID` / `SHOTS_QUIZ_ID` add the quiz pages;
   `SHOTS_OUT` changes the folder. Playwright is pinned to 1.63.0 to match
   the pre-installed Chromium — don't run `playwright install`.
3. Show the screenshots by reading the PNGs / sending them to Luke.

## Stage (a) follow-up

- `22481aa`: SubjectLocks selects get `min-width: 0` (the page scrolled sideways
  at 320–375px with long topic names). Stage (a) was pushed to `main` at
  Luke's request after review.

## What stage (b) built (student pages)

- `src/styles/components.css`: shared `.card`, `.btn` (+ `--primary`,
  `--secondary`, `--soft`, `--small`, `--block`), `.field`, `.field-label`,
  `.tag`, `.meta`, `.empty`, `.error-text`, `.link`, `.chips`/`.chip`, `kbd`.
  In a CSS Module, refer to these with `:global(.btn)` etc.
- `Modal.jsx`: bottom sheet on phone, centred dialog from 640px; focus moves
  in and is trapped, Escape/backdrop close, focus returns to the opener.
  RedeemModal and the tutor's Lesson outline drawer use it.
- Home: dashboard grid (balance | exams, then assigned work | earn more, then
  recent entries). Tablet puts balance and exams side by side.
- PlayQuiz: one question at a time in a centred card, numbered jump list,
  Previous/Next, Submit on the last question. A–D / 1–4 pick, Enter = next /
  submit (ignored when a button or field has focus). Answers are still
  collected for every question and submitted together, as before.
- Assignments: list on phone, card grid on desktop, filter chips by **type**
  (assignments don't carry their subject; a subject filter needs a join).
- TutorChat: desktop chat | lesson panel (subject, topic, subtopic, spec ref,
  learning outcomes, Finish session); phone/tablet get a "Lesson outline"
  drawer and Finish in the chat bar. `useFillViewport` sizes the chat to the
  visual viewport so the composer stays above the on-screen keyboard.
- Activity: `LedgerList layout="table"`: a real table with a sticky header
  from 640px, stacked rows on phone.
- Student pages no longer use `.device`/`.screen`. ExamCountdown lost its own
  margin; Parent.jsx has a temporary inline wrapper until stage (c).
- Review screenshots with sample rows: a throwaway script intercepted
  Supabase requests in the browser (all writes answered locally, nothing hit
  the database). Not committed.

## What stage (c) built (parent pages)

- Stage (b) was pushed to `main` after review (`ec8e3ad`).
- Overview: pending requests across the top (a grid of cards on desktop);
  then exams + subject lockouts | a "Quick actions" column (sticky) on
  desktop. Phone keeps the original order. SubjectLocks stays on Overview as
  well as `/parent/locks` (no feature removed).
- SubjectLocks: labelled fields; subject | topic | duration + Lock on one row
  on desktop.
- Assign work: form | pending + recently completed on desktop; labelled
  fields; type picker is a group of `aria-pressed` buttons.
- Redemptions: table with a sticky header from 640px, stacked rows on phone.
  Activity's table now scrolls with the page too (`overflow: clip`), so the
  header sticks to the window instead of an inner scroll box.
- Tutor transcripts: rows are `<button aria-expanded>`; desktop shows
  columns (lesson, subject · topic, started, messages, result) under a sticky
  header row.
- Assessment: subject | period | Assess on one row on desktop; result groups
  side by side; history rows are `<button aria-expanded>`.
- Login: labels tied to inputs, shared field/button classes.
- No inline styles left except runtime values (quiz progress width, chat
  height). `.device`/`.screen` removed from `layout.css`.

## What stage (d) did (accessibility pass)

- Stage (c) pushed to `main` after review (`ba5331b`).
- Contrast (WCAG AA 4.5:1 for text), measured on every surface:
  - `--ink-soft` #62707E → #48535D (was 3.4–4.5:1, now 5.3–7.0:1).
  - `--ink-faint` #8B9199 → #626870 (was 2.1–2.8:1, now 4.6:1 on paper/card;
    only used for a decorative chevron and `.faint`).
  - New `--brass-ink` #6F5425 for brass text (4.7:1+ everywhere). `--brass`
    itself is unchanged for borders, the focus ring and indicators (3:1+).
  - Manifest colours are `--ink` / `--paper-3`, unchanged, so they still match.
- Shell: page title per route ("Activity · Cortex"); on navigation focus moves
  to `<main>` and the window scrolls to the top.
- Headings: every page has one `<h1>` (Home's is visually hidden; SubjectLocks
  takes `headingLevel`).
- Quiz options follow the radio-group pattern: one Tab stop, arrow keys move
  and choose.
- Fields always show a focus ring on `:focus` (date inputs never match
  `:focus-visible` in Chromium).
- Tutor chat auto-scroll respects `prefers-reduced-motion`.
- "View more" links on Home name what they open (visually hidden text).
- Checks run (scripts not committed): axe-core 4.10 (WCAG 2.0/2.1/2.2 A+AA and
  best practice) on all 14 pages at 375 and 1440 plus the redeem modal, quiz
  answered, live tutor chat and outline drawer: no violations. Keyboard
  walkthrough: login by keyboard, skip link first, every focused element has
  a visible indicator, modal traps focus / Escape closes / focus returns,
  quiz keys work. `npx vitest run`: 57 passed.

## Analytics (replaces Assessment), phase 1

Luke's brief: rename Assessment to Analytics; a short summary of recent
activity; a graph of the last 7 days against the previous 7 (questions and
minutes, each on its own chart); AI-suggested assignments with a tick box and
due date per item and an "Assign selected" button; quality over time and by
subject. Grade estimates ("Chemistry ~5") are deferred: the only quality data
is multiple-choice accuracy and tutor engagement ratings, which don't map to
GCSE grades. That needs marked written answers (phase 2, to be discussed).

- Route `/parent/analytics`; `/parent/assessment` redirects. Nav label
  "Analytics"; Overview quick action "Analytics".
- `src/lib/analytics.js` (pure, tested in `test/analytics.test.js`):
  local-day buckets, 7 vs 7 summary + plain-English lines, per-subject quality
  (accuracy vs previous window, higher-tier and applied/calculation accuracy,
  tutor rating = minutes_earned / 30, 12-week weekly accuracy, trend with a
  10-answer minimum and 5-point threshold).
- `src/hooks/useAnalytics.js`: reads with the parent's session (RLS), pages
  past PostgREST's 1000-row cap, never loads transcripts.
- Charts (`components/analytics/ComparisonChart.jsx`): grouped columns,
  current week brass / previous week #A39A86 (emphasis pattern; validated
  with the dataviz script: CVD ΔE 14.9, normal 15.3; the gray is under 3:1
  so the chart has a legend with totals, tooltips on hover and focus, and a
  table view).
- Suggestions: new edge function `suggest-assignments` (deployed, verify_jwt
  on, read-only). Same auth as assess-student. Builds per-topic stats and a
  candidate list (next undone quiz per topic, up to two untutored lessons,
  excluding pending work and locked subjects), sends the model short refs
  (q1, t1) only, and maps the answer back, dropping unknown refs. Logic in
  `suggestion-logic.js`, tested in `test/suggestion-logic.test.js`. The page
  inserts the ticked items as assignments with the same row shape as Assign
  work.
- The old Assessment page is now `components/analytics/ProgressReview.jsx`,
  a section at the bottom of Analytics, behaviour unchanged.

## Your week (student assignments)

Luke assigns in big batches but doesn't want James overwhelmed by a long list.
`/assignments` is now "Your week" (nav label "Your week", tab "Week"):

- `src/lib/week.js` (tested in `test/week.test.js`): groups pending work into
  "from earlier", each of the next 7 days (today first), "due after this
  week" and "no due date". due_at is stored as UTC midnight of the date the
  parent picked, so the day comes from the date part of the string.
- Headline "N things due this week · M done" with a progress bar; a 7-day
  strip with dots per item.
- Phone/tablet show one day at a time (the strip picks the day; default today,
  else the next day with work) with "Show all days"; desktop shows every day
  with work in a grid and the strip scrolls to the day.
- Missed work sits in a soft "From earlier" box ("fit them in when you can"),
  not red "overdue" labels. Later, undated and completed work are collapsed.
- The type filter chips were removed. Home's panel is "Coming up": the next 3
  by due date (earlier first) with "Due today"-style labels and "See your
  week".

## Written answers, W1 (typed answers, AI marking)

Luke's decisions: typed first (photos in W2); pilot Biology + English
Literature; Claude writes original AQA-style questions and mark schemes;
Higher tier in all sciences; reward 1 min per mark + 5 at 70%; marks shown
to the student straight away, labelled AI-marked, parent can adjust.

- Migrations (applied): `20261105142452_written_marking.sql`
  (`fm_mark_schemes`, readable by parents only; attempt columns; trigger
  completing the written_test assignment; `review_written_attempt` RPC;
  student insert policy on fm_attempts removed; the 2 old test questions
  linked to topics) and `20261105143500_written_command_words.sql`
  (adds "determine" and "explore").
- Content: `scripts/authored/written/*.json` → `scripts/generate-written.mjs`
  → `supabase/content-batches/2026-11-05-written-pilot-biology-english.sql`
  (applied as migration `written_pilot_biology_english`): 14 Biology, 8
  English Literature. The 2 old test questions have no scheme and were set
  inactive.
- Edge function `mark-written-answer` (deployed, verify_jwt on): requires a
  pending written_test assignment; marks twice in parallel; mean rounded
  down; flags if the markings differ by more than max(1, 10% of marks);
  saves the attempt (service role), which completes the assignment; ledger
  reward except for the practice student. Logic in `marking-logic.js`,
  tested in `test/marking-logic.test.js`.
- Student: `/written/:questionId` (from Your week "Start answer"): question,
  command-word hint, suggested time + optional timer, word count, draft kept
  on the device, no spellcheck where SPaG is marked; result shows mark,
  level, what got marks, what would get more, next step. Home's Written test
  card now opens Your week.
- Parent: Assign work titles written tests "<lesson>: written answer (N
  marks)" and previews the question. Analytics has a Written work section
  (answer, feedback, both markings, mark scheme, Save mark).
- Tested end to end as the practice student (2/2 Biology, 3/8 English with
  markings 3 and 4); review RPC checked; 0 minutes for practice.

## Written answers: integrity checks

- The answer page records how text arrives (beforeinput: typed incl. phone
  keyboards/autocorrect; paste events with length; drops), active typing
  time (gaps over 20 s ignored) and tab switches, kept with the draft and
  sent with the answer. Students see "pasted text is recorded"; nothing is
  blocked.
- `integrity-logic.js` (tested in `test/integrity-logic.test.js`): flags 25%+
  pasted, a single paste of 150+ chars, text unaccounted for by typing or
  pasting, over 450 typed chars/min, or a missing record; a phrase check for
  AI-style writing and formatting; each marking also returns ai_likelihood
  and ai_signals (never shown to the student), combined by taking the
  higher. Flags set needs_review and are stored in `fm_attempts.integrity`
  (migration `written_integrity`); the mark and minutes are unchanged.
- Tested as the practice student: a typed answer (391 chars/min) was not
  flagged; a pasted AI-style answer was flagged for 100% paste and high AI
  likelihood from both markings and the phrase check.

## Written answers: no pasting, flagged answers told, minutes held

- Pasting and drag-and-drop are blocked in the answer box (paste, drop and
  beforeinput insertFromPaste/Drop are cancelled) with a notice; a saved
  draft containing pasted text is cleared. The function rejects any answer
  whose record shows pasted/dropped text, or with no record, before marking
  (`pasteRejection` in integrity-logic.js).
- Flagged answers (AI or typing signs) tell the student on the result
  ("flagged as possibly AI-written and sent to Dad to check... minutes on
  hold"). Their minutes go to `fm_attempts.minutes_held`, not the ledger.
- `release_written_reward(attempt, release)` (migration
  `written_held_rewards`): parent-only; release pays 1/mark + 5 at 70% on
  the parent's mark if set (0 for practice) with a "(released)" ledger
  entry; withhold pays nothing; one decision per attempt. Parents get
  Release / Withhold in Written work.
- Tested on the practice student: browser paste blocked; direct calls with a
  paste record or no record refused (400); a typed AI-style answer marked
  3/6 and flagged with the student notice; release tested in a rolled-back
  transaction (paid 3, one ledger row, second release refused).

## Analytics: work set for the student

`components/analytics/AssignedStatus.jsx`, near the top of Analytics, using
the Your week grouping (`groupWeek`) plus `daysLate` / `onTimeRate` in
`src/lib/week.js` (tested): tiles for overdue, due next 7 days (with later /
no date counts), done this week and on-time rate over 30 days; overdue list
with days late; next 7 days by day; collapsed later / undated / recently
completed (on time or N days late). Items show subject · topic
(useAssignments now also selects subject_id, topic_id).

## Subject wallpapers

- Seven faint line-drawn SVG tiles in `src/assets/wallpapers/` (biology,
  chemistry, physics, english, economics, business, pe), ink at 9% and brass
  at 14% opacity, 240px tiles, under 1.4 KB each.
- `src/lib/wallpapers.js` maps a subject name to its tile. The shell
  (`AppShell`) renders a fixed layer at z-index -1 and provides
  `WallpaperContext`; pages call `useSubjectWallpaper(subjectName)`
  (`components/shell/Wallpaper.jsx`), which clears on leaving the page.
- Used by TutorChat (follows the subject picker), PlayQuiz, Quiz (question
  review) and WrittenTest. PlayQuiz and Quiz now also fetch the subject name.
- Hidden in forced-colours mode; the fade respects reduced motion. Vite
  inlines the SVGs as data URIs, so the url() must be quoted.

## Quiz distractor rewrites (answers too easy to spot)

Luke noticed quizzes were too easy: the correct answer was usually the
longest and the others were implausible. Measured on 6 Nov: the correct
option was the longest in 54% of active questions (fair is ~25%): English
Literature 85%, Biology 64%, Economics 57%, Chemistry 56%, Physics 40%, PE 43%,
Business 13% (fine). Wrong options often used absolutes ("always", "only
ever", "no effect") or were throwaways, and the correct one was often the
only one that hedged.

- `supabase/functions/rewrite-distractors/option-quality.js` (tested):
  per-question give-away check (length band, absolutes only in wrong
  options, hedging only in the right one, throwaways, duplicates) and a batch
  summary. `scripts/generate-subject.mjs` now reports and warns on it.
- `question_option_revisions` table (migration): staged rewrites with the
  old options kept, status draft/flagged/applied/rejected/rolled_back; RLS on,
  no policies (service role only).
- Edge function `rewrite-distractors` (parent-only, deployed): drafts 3 new
  wrong answers per question (correct answer never changed), quality-checks
  with one retry, then a separate call answers the rewritten question and
  flags it if it picks another option or finds another defensible one.
  Drafts only; nothing live changes there. Driven in batches of 8.
- Apply / rollback SQL in `supabase/content-batches/2026-11-06-english-distractors-*.sql`;
  apply only touches rows whose live options still match old_options.
- Analytics shows a "Harder quizzes from 6 Nov" note for English Literature
  (`src/lib/contentChanges.js`) so the expected score drop isn't read as
  decline.

## Written answers: the remaining subjects

- Authored in `scripts/authored/written/`: Chemistry (12), Physics (12),
  Economics (10), Business (9), PE (10), Maths (12), English Language (11),
  76 in all. At least one per topic (PE's inactive "Use of Data" excepted).
  Each follows its board: AQA sciences 4/6-mark, Economics 9-mark evaluate,
  Eduqas Business 8-mark evaluate, OCR PE 6-mark extended response,
  Edexcel Maths method marks, English Language paper-style questions with
  original source texts written for them.
- English Language Q5 (40 marks) stores AO6 technical accuracy as the
  separate SPaG marks (16), so content is marked out of 24.
- `supabase/content-batches/2026-11-08-written-remaining-subjects.sql` (+
  `.rollback.sql`, which refuses if any question has an attempt). The
  generator now writes one statement per subject with the questions as a
  JSON array. **Applied** as migrations `written_chemistry`,
  `written_physics`, `written_economics`, `written_business`, `written_pe`,
  `written_maths`, `written_english_language`. Verified against a local dry
  run: every question's row and mark scheme hash identically (whole-subject
  checksums can differ only by collation order).
- `test/written-content.test.js` checks every authored file: DB constraints,
  AO marks add up to the total, points max equals content marks, levels run
  1..content with no gaps, no duplicate question text.
