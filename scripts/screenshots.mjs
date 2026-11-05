// Screenshots of every page at phone / tablet / desktop widths, against the
// real Supabase project, plus a horizontal-overflow check from 320 to 1920px.
//
//   CORTEX_PARENT_EMAIL=... CORTEX_PARENT_PASSWORD=... npm run screenshots
//
// Signs in as the parent. The parent's student view runs as the practice
// student (the practice account itself is banned from signing in), so the
// student pages are captured that way: practice data only, never James's.
// Optional: SHOTS_OUT (default screenshots/), SHOTS_PAGES (comma-separated
// page names to limit the run), SHOTS_QUIZ_ID / SHOTS_TOPIC_ID to include the
// quiz-play and topic pages.
//
// Builds and serves the app with `vite preview`; VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY must be set (e.g. in .env.local).
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import { build, preview } from 'vite'

const WIDTHS = { phone: 375, tablet: 768, desktop: 1440 }
const OVERFLOW_WIDTHS = [320, 375, 640, 768, 1024, 1440, 1920]
const OUT = process.env.SHOTS_OUT || 'screenshots'

const email = process.env.CORTEX_PARENT_EMAIL
const password = process.env.CORTEX_PARENT_PASSWORD
if (!email || !password) {
  console.error('Set CORTEX_PARENT_EMAIL and CORTEX_PARENT_PASSWORD.')
  process.exit(1)
}

const PAGES = [
  // Student view (as the parent's practice student)
  { name: 'student-home', path: '/' },
  { name: 'student-quizzes', path: '/quizzes' },
  { name: 'student-tutor', path: '/tutor' },
  { name: 'student-assignments', path: '/assignments' },
  { name: 'student-activity', path: '/activity' },
  ...(process.env.SHOTS_TOPIC_ID ? [{ name: 'student-quiz-topic', path: `/quiz/${process.env.SHOTS_TOPIC_ID}` }] : []),
  ...(process.env.SHOTS_QUIZ_ID ? [{ name: 'student-play-quiz', path: `/play/${process.env.SHOTS_QUIZ_ID}` }] : []),
  // Parent mode
  { name: 'parent-overview', path: '/parent' },
  { name: 'parent-assign', path: '/parent/assign' },
  { name: 'parent-locks', path: '/parent/locks' },
  { name: 'parent-redemptions', path: '/parent/redemptions' },
  { name: 'parent-transcripts', path: '/parent/tutor-sessions' },
  { name: 'parent-analytics', path: '/parent/analytics' },
]

const only = process.env.SHOTS_PAGES?.split(',').map((s) => s.trim()).filter(Boolean)
const pages = only ? PAGES.filter((p) => only.includes(p.name)) : PAGES

async function settle(page) {
  // Realtime keeps a websocket open, which networkidle ignores; cap the wait.
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  await page.evaluate(() => document.fonts?.ready)
  await page.waitForTimeout(300)
}

async function overflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth > doc.clientWidth ? doc.scrollWidth - doc.clientWidth : 0
  })
}

await mkdir(OUT, { recursive: true })
await build({ logLevel: 'warn' })
const server = await preview({ preview: { port: 4173, strictPort: false }, logLevel: 'warn' })
const baseURL = server.resolvedUrls.local[0].replace(/\/$/, '')

const browser = await chromium.launch()
const problems = []

try {
  // Login page, signed out.
  for (const [label, width] of Object.entries(WIDTHS)) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    await page.goto(`${baseURL}/login`)
    await settle(page)
    await page.screenshot({ path: path.join(OUT, `login-${label}.png`), fullPage: true })
    await ctx.close()
  }

  // Sign in once, reuse the session for every page and width.
  const loginCtx = await browser.newContext()
  const loginPage = await loginCtx.newPage()
  await loginPage.goto(`${baseURL}/login`)
  await loginPage.fill('input[type="email"]', email)
  await loginPage.fill('input[type="password"]', password)
  await loginPage.click('button[type="submit"]')
  await loginPage.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })
  const storageState = await loginCtx.storageState()
  await loginCtx.close()

  for (const { name, path: route } of pages) {
    for (const [label, width] of Object.entries(WIDTHS)) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, storageState })
      const page = await ctx.newPage()
      page.on('pageerror', (err) => problems.push(`${name} @${width}: page error: ${err.message}`))
      await page.goto(`${baseURL}${route}`)
      await settle(page)
      await page.screenshot({ path: path.join(OUT, `${name}-${label}.png`), fullPage: true })
      await ctx.close()
    }

    // Horizontal overflow across the full width range (no screenshots).
    const ctx = await browser.newContext({ viewport: { width: 320, height: 900 }, storageState })
    const page = await ctx.newPage()
    await page.goto(`${baseURL}${route}`)
    await settle(page)
    for (const width of OVERFLOW_WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(100)
      const px = await overflow(page)
      if (px > 0) problems.push(`${name} @${width}px: page scrolls horizontally by ${px}px`)
    }
    await ctx.close()
    console.log(`captured ${name}`)
  }
} finally {
  await browser.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}

if (problems.length) {
  console.log('\nProblems:')
  for (const p of problems) console.log(`  - ${p}`)
  process.exitCode = 1
} else {
  console.log('\nNo horizontal overflow at 320-1920px and no page errors.')
}
console.log(`Screenshots in ${OUT}/`)
