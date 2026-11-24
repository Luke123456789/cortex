// The weekly plan: a parent's targets for Monday-Sunday, and progress against
// them worked out from what the student actually did. Pure; tested in
// test/weeklyPlan.test.js.

const DAY = 24 * 60 * 60 * 1000

const pad = (n) => String(n).padStart(2, '0')
export const localKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Monday of the week containing `date`, as 'YYYY-MM-DD' (local time).
export function mondayOf(date = new Date()) {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0) // midday keeps DST shifts from changing the day
  const back = (d.getDay() + 6) % 7
  return localKey(new Date(d.getTime() - back * DAY))
}

export function shiftWeek(weekStart, weeks) {
  const [y, m, d] = weekStart.split('-').map(Number)
  return localKey(new Date(y, m - 1, d + weeks * 7, 12))
}

// Local-midnight bounds of the week: [from, to).
export function weekBounds(weekStart) {
  const [y, m, d] = weekStart.split('-').map(Number)
  return { from: new Date(y, m - 1, d), to: new Date(y, m - 1, d + 7) }
}

export function weekLabel(weekStart) {
  const { from, to } = weekBounds(weekStart)
  const end = new Date(to.getTime() - DAY / 2)
  const fmt = (x) => x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(from)} – ${fmt(end)}`
}

// Rough active minutes per activity, capped so a session left open overnight
// doesn't count as hours of work.
const TUTOR_CAP_MIN = 45
const QUIZ_MIN_PER_QUESTION = 0.5

function minutesBetween(a, b, cap) {
  if (!a || !b) return 0
  const m = (new Date(b) - new Date(a)) / 60000
  return m > 0 ? Math.min(m, cap) : 0
}

// activity: {
//   tutorSessions: [{ started_at, completed_at, reward_claimed, subject_id }],
//   attempts:      [{ submitted_at, active_ms, marks, total, subject_id }],
//   quizzes:       [{ started_at, completed_at, question_count, score, subject_id }],
// }
export function computeProgress(activity, { from, to }) {
  const inWeek = (iso) => {
    if (!iso) return false
    const t = new Date(iso)
    return t >= from && t < to
  }
  const tutor = (activity.tutorSessions ?? []).filter((s) => s.reward_claimed && inWeek(s.completed_at))
  const attempts = (activity.attempts ?? []).filter((a) => inWeek(a.submitted_at))
  const quizzes = (activity.quizzes ?? []).filter((q) => q.completed_at && inWeek(q.completed_at))

  const minutesBySubject = {}
  const addMin = (sid, m) => { if (sid && m > 0) minutesBySubject[sid] = (minutesBySubject[sid] ?? 0) + m }
  for (const s of tutor) addMin(s.subject_id, minutesBetween(s.started_at, s.completed_at, TUTOR_CAP_MIN))
  for (const a of attempts) addMin(a.subject_id, a.active_ms ? a.active_ms / 60000 : 0)
  for (const q of quizzes) addMin(q.subject_id, (q.question_count ?? 0) * QUIZ_MIN_PER_QUESTION)
  const minutes =
    tutor.reduce((n, s) => n + minutesBetween(s.started_at, s.completed_at, TUTOR_CAP_MIN), 0) +
    attempts.reduce((n, a) => n + (a.active_ms ? a.active_ms / 60000 : 0), 0) +
    quizzes.reduce((n, q) => n + (q.question_count ?? 0) * QUIZ_MIN_PER_QUESTION, 0)
  for (const k of Object.keys(minutesBySubject)) minutesBySubject[k] = Math.round(minutesBySubject[k])
  const papers = (activity.papers ?? []).filter((p) => inWeek(p.completed_at)).length

  const subjects = new Set([...tutor, ...attempts, ...quizzes].map((x) => x.subject_id).filter(Boolean))
  const days = new Set([
    ...tutor.map((s) => localKey(new Date(s.completed_at))),
    ...attempts.map((a) => localKey(new Date(a.submitted_at))),
    ...quizzes.map((q) => localKey(new Date(q.completed_at))),
  ])
  const marked = attempts.filter((a) => a.total > 0 && a.marks != null)
  const examPct = marked.length
    ? Math.round((100 * marked.reduce((n, a) => n + a.marks, 0)) / marked.reduce((n, a) => n + a.total, 0))
    : null

  return {
    tutorSessions: tutor.length,
    examQuestions: attempts.length,
    quizzes: quizzes.length,
    minutes: Math.round(minutes),
    minutesBySubject,
    papers,
    subjects,
    daysActive: days.size,
    examPct,
  }
}

// One row per target that was set: { key, label, done, target, met }.
// subjects: [{ id, name }] for naming per-subject time targets.
export function targetRows(plan, progress, subjects = []) {
  if (!plan) return []
  const name = (id) => subjects.find((s) => s.id === id)?.name ?? 'Subject'
  const perSubject = Object.entries(plan.subject_minutes ?? {}).filter(([, m]) => m > 0)
  const rows = perSubject.length
    ? perSubject.map(([id, m]) => [`time:${id}`, `${name(id)} time`, progress.minutesBySubject?.[id] ?? 0, m, fmtMinutes])
    : [['study_minutes', 'Study time', progress.minutes, plan.study_minutes, fmtMinutes]]
  rows.push(
    ['tutor_sessions', 'Tutor sessions', progress.tutorSessions, plan.tutor_sessions, String],
    ['exam_questions', 'Written answers', progress.examQuestions, plan.exam_questions, String],
    ['papers', 'Exam papers', progress.papers ?? 0, plan.papers ?? 0, String],
    ['quizzes', 'Quizzes', progress.quizzes, plan.quizzes, String],
  )
  return rows
    .filter(([, , , target]) => target > 0)
    .map(([key, label, done, target, fmt]) => ({ key, label, done, target, met: done >= target, doneText: fmt(done), targetText: fmt(target) }))
}

export function fmtMinutes(n) {
  const h = Math.floor(n / 60)
  const m = Math.round(n % 60)
  if (!h) return `${m} min`
  return m ? `${h}h ${m}m` : `${h}h`
}

const tick = (met) => (met ? '✅' : '⬜')

// WhatsApp text. With progress it reads as a check-in; without, as the plan.
// items: the week's set work, [{ title, status }] (status 'completed' ticks it).
export function planShareText({ plan, name, subjectNames = [], subjects = [], progress = null, weekStart, items = [] }) {
  const who = name ? `${name}'s` : 'The'
  const out = [`🗓️ ${who} revision plan — w/c ${weekLabel(weekStart)}`]
  if (!plan) return `${out[0]}\nNo plan set for this week yet.`

  const rows = targetRows(plan, progress ?? { minutes: 0, minutesBySubject: {}, tutorSessions: 0, examQuestions: 0, papers: 0, quizzes: 0 }, subjects)
  if (rows.length) {
    out.push('')
    for (const r of rows) {
      out.push(progress ? `${tick(r.met)} ${r.label}: ${r.doneText} of ${r.targetText}` : `• ${r.label}: ${r.targetText}`)
    }
  }
  if (subjectNames.length) {
    out.push('')
    if (progress) {
      const covered = subjectNames.filter((s) => s.covered).map((s) => s.name)
      const missing = subjectNames.filter((s) => !s.covered).map((s) => s.name)
      out.push(`Focus subjects: ${subjectNames.map((s) => s.name).join(', ')}`)
      if (covered.length) out.push(`Covered so far: ${covered.join(', ')}`)
      if (missing.length) out.push(`Not touched yet: ${missing.join(', ')}`)
    } else {
      out.push(`Focus subjects: ${subjectNames.map((s) => s.name).join(', ')}`)
    }
  }
  if (items.length) {
    out.push('', 'Set work this week:')
    for (const i of items) out.push(`${progress ? `${tick(i.status === 'completed')} ` : '• '}${i.title}`)
  }
  if (progress) {
    out.push('')
    out.push(`Days worked: ${progress.daysActive} of 7`)
    if (progress.examPct != null) out.push(`Average exam-question mark: ${progress.examPct}%`)
  }
  if (plan.note) {
    out.push('')
    out.push(`Note: ${plan.note}`)
  }
  return out.join('\n')
}
