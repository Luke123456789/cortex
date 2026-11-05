// Pure aggregation for the parent Analytics page. Everything works in the
// browser's local days. No I/O; unit-tested in test/analytics.test.js.

const DAY = 24 * 60 * 60 * 1000

// Minutes the tutor grader can award per session (grade-tutor-session).
export const TUTOR_MAX_MINUTES = 30
// Fewer answers than this in a window and we don't call a trend.
export const MIN_ANSWERS_FOR_TREND = 10
// Accuracy change (percentage points) that counts as a real move.
export const TREND_THRESHOLD = 5

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Days ago, in whole local days (0 = today).
export function dayIndex(iso, now = new Date()) {
  return Math.round((startOfDay(now) - startOfDay(iso)) / DAY)
}

// The 14 local days ending today: current = oldest..today, previous = the 7
// before. Each entry is the Date at the start of that day.
export function dayWindows(now = new Date()) {
  const today = startOfDay(now)
  const at = (n) => new Date(today.getTime() - n * DAY)
  return {
    current: [6, 5, 4, 3, 2, 1, 0].map(at),
    previous: [13, 12, 11, 10, 9, 8, 7].map(at),
  }
}

// Sums value(row) into the 7 current and 7 previous days by date(row).
export function bucketByDay(rows, date, value, now = new Date()) {
  const current = Array(7).fill(0)
  const previous = Array(7).fill(0)
  for (const row of rows) {
    const iso = date(row)
    if (!iso) continue
    const ago = dayIndex(iso, now)
    if (ago >= 0 && ago <= 6) current[6 - ago] += value(row)
    else if (ago >= 7 && ago <= 13) previous[13 - ago] += value(row)
  }
  return { current, previous }
}

function inWindow(iso, fromAgo, toAgo, now) {
  if (!iso) return false
  const ago = dayIndex(iso, now)
  return ago >= fromAgo && ago <= toAgo
}

export function pct(correct, total) {
  return total > 0 ? Math.round((correct / total) * 100) : null
}

// Maps topic/subtopic ids to their subject for attributing activity.
export function subjectLookup({ topics, subtopics }) {
  const topicSubject = new Map(topics.map((t) => [t.id, t.subject_id]))
  const subtopicSubject = new Map(subtopics.map((s) => [s.id, topicSubject.get(s.topic_id)]))
  return { topicSubject, subtopicSubject }
}

// Headline numbers for days [fromAgo..toAgo].
function windowTotals({ quizSessions, tutorSessions, ledger, lookup, subjectNames }, fromAgo, toAgo, now) {
  const quizzes = quizSessions.filter((q) => inWindow(q.completed_at, fromAgo, toAgo, now))
  const tutors = tutorSessions.filter((t) => inWindow(t.completed_at, fromAgo, toAgo, now))
  const entries = ledger.filter((e) => inWindow(e.created_at, fromAgo, toAgo, now))
  const questions = quizzes.reduce((n, q) => n + (q.question_count || 0), 0)
  const correct = quizzes.reduce((n, q) => n + (q.score || 0), 0)
  const subjects = new Set([
    ...quizzes.map((q) => lookup.topicSubject.get(q.topic_id)),
    ...tutors.map((t) => lookup.subtopicSubject.get(t.subtopic_id)),
  ].filter(Boolean))
  return {
    quizzes: quizzes.length,
    questions,
    accuracy: pct(correct, questions),
    tutorSessions: tutors.length,
    minutesEarned: entries.filter((e) => e.type === 'earn').reduce((n, e) => n + (e.amount_minutes || 0), 0),
    minutesRedeemed: entries.filter((e) => e.type === 'spend').reduce((n, e) => n + (e.amount_minutes || 0), 0),
    subjects: [...subjects].map((id) => subjectNames.get(id)).filter(Boolean).sort(),
  }
}

// Last 7 days vs the 7 before, plus when and what the student last did.
export function summarize({ subjects, topics, subtopics, quizSessions, tutorSessions, ledger, now = new Date() }) {
  const lookup = subjectLookup({ topics, subtopics })
  const subjectNames = new Map(subjects.map((s) => [s.id, s.name]))
  const input = { quizSessions, tutorSessions, ledger, lookup, subjectNames }

  const events = [
    ...quizSessions.filter((q) => q.completed_at).map((q) => ({ at: q.completed_at, kind: 'quiz', subjectId: lookup.topicSubject.get(q.topic_id) })),
    ...tutorSessions.filter((t) => t.completed_at).map((t) => ({ at: t.completed_at, kind: 'tutor session', subjectId: lookup.subtopicSubject.get(t.subtopic_id) })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at))
  const last = events[0]

  // Subjects with nothing in the last 30 days (or ever).
  const lastBySubject = new Map()
  for (const e of events) if (e.subjectId && !lastBySubject.has(e.subjectId)) lastBySubject.set(e.subjectId, e.at)
  const neglected = subjects
    .map((s) => ({ name: s.name, lastActive: lastBySubject.get(s.id) ?? null }))
    .filter((s) => !s.lastActive || dayIndex(s.lastActive, now) > 30)

  return {
    current: windowTotals(input, 0, 6, now),
    previous: windowTotals(input, 7, 13, now),
    lastActive: last ? { at: last.at, kind: last.kind, subject: subjectNames.get(last.subjectId) ?? null, daysAgo: dayIndex(last.at, now) } : null,
    neglected,
  }
}

// Plain-English lines for the summary card.
export function summaryLines(summary, studentName = 'He') {
  const { current, previous, lastActive, neglected } = summary
  const lines = []
  if (current.quizzes === 0 && current.tutorSessions === 0) {
    lines.push(lastActive
      ? `No quizzes or tutor sessions in the last 7 days. Last active ${lastActive.daysAgo} day${lastActive.daysAgo === 1 ? '' : 's'} ago (${lastActive.kind}${lastActive.subject ? `, ${lastActive.subject}` : ''}).`
      : 'No quizzes or tutor sessions yet.')
  } else {
    const parts = []
    if (current.quizzes) parts.push(`${current.quizzes} quiz${current.quizzes === 1 ? '' : 'zes'} (${current.questions} questions, ${current.accuracy}% correct)`)
    if (current.tutorSessions) parts.push(`${current.tutorSessions} tutor session${current.tutorSessions === 1 ? '' : 's'}`)
    lines.push(`${studentName} did ${parts.join(' and ')} in the last 7 days${current.subjects.length ? `, in ${current.subjects.join(', ')}` : ''}.`)
    const before = previous.quizzes + previous.tutorSessions
    const now = current.quizzes + current.tutorSessions
    if (before === 0) lines.push('Nothing in the 7 days before that.')
    else if (now > before) lines.push(`More than the previous 7 days (${before} piece${before === 1 ? '' : 's'} of work).`)
    else if (now < before) lines.push(`Less than the previous 7 days (${before} piece${before === 1 ? '' : 's'} of work).`)
    else lines.push('About the same as the previous 7 days.')
  }
  const never = neglected.filter((s) => !s.lastActive).map((s) => s.name)
  const stale = neglected.filter((s) => s.lastActive).map((s) => s.name)
  if (never.length) lines.push(`Never started: ${never.join(', ')}.`)
  if (stale.length) lines.push(`Nothing for over 30 days: ${stale.join(', ')}.`)
  return lines
}

export function trendLabel(current, previous, min = MIN_ANSWERS_FOR_TREND, threshold = TREND_THRESHOLD) {
  if (!current || !previous || current.answers < min || previous.answers < min) return 'not-enough'
  const diff = current.accuracy - previous.accuracy
  if (diff >= threshold) return 'improving'
  if (diff <= -threshold) return 'slipping'
  return 'steady'
}

// Quality per subject over a window of `days` against the window before it.
// history rows: { seen_at, answered_correctly, questions: { difficulty, question_type, topic_id } | null }
// (questions is null for answers to questions that have since been retired;
// those still count via quiz_sessions, just not in the tier/type split).
export function subjectQuality({ subjects, topics, subtopics, quizSessions, tutorSessions, history, days = 30, weeks = 12, now = new Date() }) {
  const lookup = subjectLookup({ topics, subtopics })

  return subjects.map((subject) => {
    const mineQ = quizSessions.filter((q) => q.completed_at && lookup.topicSubject.get(q.topic_id) === subject.id)
    const mineT = tutorSessions.filter((t) => t.completed_at && lookup.subtopicSubject.get(t.subtopic_id) === subject.id)
    const mineH = history.filter((h) => h.questions && lookup.topicSubject.get(h.questions.topic_id) === subject.id)

    const quizWindow = (from, to) => {
      const qs = mineQ.filter((q) => inWindow(q.completed_at, from, to, now))
      const answers = qs.reduce((n, q) => n + (q.question_count || 0), 0)
      const correct = qs.reduce((n, q) => n + (q.score || 0), 0)
      return { quizzes: qs.length, answers, accuracy: pct(correct, answers) }
    }
    const split = (from, to, keep) => {
      const hs = mineH.filter((h) => inWindow(h.seen_at, from, to, now) && keep(h.questions))
      return { answers: hs.length, accuracy: pct(hs.filter((h) => h.answered_correctly).length, hs.length) }
    }
    const tutorWindow = (from, to) => {
      const ts = mineT.filter((t) => inWindow(t.completed_at, from, to, now) && t.minutes_earned != null)
      const avg = ts.length ? ts.reduce((n, t) => n + t.minutes_earned, 0) / ts.length : null
      return { sessions: ts.length, rating: avg == null ? null : Math.round((avg / TUTOR_MAX_MINUTES) * 100) }
    }

    const current = quizWindow(0, days - 1)
    const previous = quizWindow(days, days * 2 - 1)

    // Weekly accuracy for the sparkline, oldest first; null = no quizzes.
    const weekly = []
    for (let w = weeks - 1; w >= 0; w -= 1) weekly.push(quizWindow(w * 7, w * 7 + 6).accuracy)

    const allAnswers = mineQ.reduce((n, q) => n + (q.question_count || 0), 0)
    const allCorrect = mineQ.reduce((n, q) => n + (q.score || 0), 0)
    const lastActive = [...mineQ.map((q) => q.completed_at), ...mineT.map((t) => t.completed_at)].sort().pop() ?? null

    return {
      subjectId: subject.id,
      name: subject.name,
      examBoard: subject.exam_board ?? null,
      current,
      previous,
      trend: trendLabel(current, previous),
      higher: split(0, days - 1, (q) => q.difficulty === 'higher'),
      applied: split(0, days - 1, (q) => q.question_type === 'applied' || q.question_type === 'calculation'),
      tutor: tutorWindow(0, days - 1),
      allTime: { answers: allAnswers, accuracy: pct(allCorrect, allAnswers) },
      weekly,
      lastActive,
      hasAnyActivity: mineQ.length > 0 || mineT.length > 0,
    }
  })
}

// Rounded axis maximum and tick step for a bar chart.
export function niceScale(max, ticks = 4) {
  if (!max || max <= 0) return { max: ticks, step: 1 }
  const rough = max / ticks
  const pow = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough)
  const niceStep = Number.isInteger(step) ? step : Math.ceil(step)
  return { max: niceStep * Math.ceil(max / niceStep), step: niceStep }
}
