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
