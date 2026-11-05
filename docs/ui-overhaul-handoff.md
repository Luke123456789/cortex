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
