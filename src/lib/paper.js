// Mock paper sums and clock. Pure; tested in test/paper.test.js.

// Marks so far, overall and by topic. A parent's mark wins over the AI's.
// Unanswered questions count as 0 out of their marks.
export function paperSummary(questions, attempts) {
  const byQuestion = new Map(attempts.map((a) => [a.question_id, a]))
  const topics = new Map()
  let marks = 0
  let answered = 0
  let minutes = 0
  let held = 0
  let toReview = 0
  for (const q of questions) {
    const a = byQuestion.get(q.id)
    const got = a ? (a.parent_marks ?? a.marks_awarded ?? 0) : 0
    if (a) {
      answered += 1
      minutes += a.minutes_earned || 0
      held += a.minutes_held || 0
      if (a.needs_review && a.parent_marks == null) toReview += 1
    }
    marks += got
    const name = q.topics?.name || 'Other'
    const t = topics.get(name) || { topic: name, marks: 0, available: 0 }
    t.marks += got
    t.available += q.total_marks
    topics.set(name, t)
  }
  const available = questions.reduce((n, q) => n + q.total_marks, 0)
  return {
    answered,
    questions: questions.length,
    marks,
    available,
    percent: available ? Math.round((marks / available) * 100) : 0,
    minutes,
    held,
    toReview,
    byTopic: [...topics.values()].sort((a, b) => b.available - a.available || a.topic.localeCompare(b.topic)),
  }
}

// Seconds left on the paper clock (negative once time is up).
export function secondsLeft(startedAt, durationMinutes, now = Date.now()) {
  if (!startedAt) return durationMinutes * 60
  return Math.round(durationMinutes * 60 - (now - new Date(startedAt).getTime()) / 1000)
}

export function fmtDuration(totalSeconds) {
  const s = Math.abs(Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}
