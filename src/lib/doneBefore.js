// What a student has already done, keyed the way Assign work picks things:
// quizzes by quiz id, written questions by question id, tutor lessons by
// subtopic id. Counts work they started themselves as well as assigned work.
// Pure; tested in test/doneBefore.test.js.

function add(map, key, at, result) {
  if (!key || !at) return
  const entry = map.get(key) || { count: 0, lastAt: null, lastResult: null }
  entry.count += 1
  if (!entry.lastAt || at > entry.lastAt) {
    entry.lastAt = at
    entry.lastResult = result
  }
  map.set(key, entry)
}

export function doneIndex({ quizSessions = [], attempts = [], tutorSessions = [] }) {
  const quiz = new Map()
  const written = new Map()
  const tutor = new Map()
  for (const s of quizSessions) {
    add(quiz, s.quiz_id, s.completed_at, s.question_count ? `${s.score ?? 0}/${s.question_count}` : null)
  }
  for (const a of attempts) {
    const marks = a.parent_marks ?? a.marks_awarded
    add(written, a.question_id, a.submitted_at, marks != null && a.total_marks ? `${marks}/${a.total_marks} marks` : null)
  }
  for (const s of tutorSessions) {
    add(tutor, s.subtopic_id, s.completed_at, null)
  }
  return { quiz, written, tutor }
}

const fmtDay = (iso) => new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' })

// "Already done twice, last on 6 Nov (14/20)."
export function doneSentence(entry, who = 'They') {
  if (!entry) return null
  const times = entry.count === 1 ? 'once' : entry.count === 2 ? 'twice' : `${entry.count} times`
  const result = entry.lastResult ? ` (${entry.lastResult})` : ''
  const when = entry.count === 1 ? `on ${fmtDay(entry.lastAt)}` : `${times}, last on ${fmtDay(entry.lastAt)}`
  return `${who} has already done this ${when}${result}.`
}
