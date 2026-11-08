// The parent's work history: every assignment ever set for a student, with
// what happened to it and the result. Pure; tested in test/history.test.js.
import { ASSIGNMENT_TYPE_LABELS } from './assignments'
import { daysLate, dueDayKey } from './week'

export const STATES = {
  on_time: { label: 'Done on time', group: 'done' },
  late: { label: 'Done late', group: 'done' },
  done: { label: 'Done', group: 'done' },
  overdue: { label: 'Overdue', group: 'not_done' },
  pending: { label: 'Not done yet', group: 'not_done' },
  cancelled: { label: 'Cancelled', group: 'cancelled' },
}

export function stateOf(a, now = new Date()) {
  if (a.status === 'cancelled') return 'cancelled'
  if (a.status === 'completed') {
    if (!a.due_at || !a.completed_at) return 'done'
    return daysLate(a.due_at, new Date(a.completed_at)) > 0 ? 'late' : 'on_time'
  }
  if (a.due_at && daysLate(a.due_at, now) > 0) return 'overdue'
  return 'pending'
}

const pct = (n, d) => (d ? Math.round((n / d) * 100) : null)

// What the student got for it, as a short phrase plus a number for sorting.
export function resultOf(a, { quizSessions, attempts, tutorSessions }) {
  if (a.status !== 'completed') return null
  if (a.type === 'quiz') {
    const s = quizSessions.get(a.quiz_session_id)
    if (!s || !s.question_count) return null
    return { text: `${s.score ?? 0}/${s.question_count} (${pct(s.score ?? 0, s.question_count)}%)`, pct: pct(s.score ?? 0, s.question_count) }
  }
  if (a.type === 'written_test') {
    const t = attempts.get(a.fm_attempt_id)
    if (!t || !t.total_marks) return null
    const marks = t.parent_marks ?? t.marks_awarded ?? 0
    const notes = []
    if (t.parent_marks != null && t.parent_marks !== t.marks_awarded) notes.push(`AI gave ${t.marks_awarded}`)
    if (t.needs_review && t.reward_decision == null && t.parent_marks == null) notes.push('needs your review')
    return { text: `${marks}/${t.total_marks} marks${notes.length ? ` (${notes.join('; ')})` : ''}`, pct: pct(marks, t.total_marks) }
  }
  if (a.type === 'tutor_session') {
    const s = tutorSessions.get(a.tutor_session_id)
    if (!s) return null
    const parts = [`${s.message_count ?? 0} messages`]
    if (s.minutes_earned) parts.push(`${s.minutes_earned} min earned`)
    return { text: parts.join(', '), pct: null }
  }
  return null
}

export function historyRows(assignments, results, names, now = new Date()) {
  return assignments.map((a) => {
    const state = stateOf(a, now)
    const late = a.due_at ? daysLate(a.due_at, a.completed_at ? new Date(a.completed_at) : now) : null
    return {
      id: a.id,
      title: a.title,
      type: ASSIGNMENT_TYPE_LABELS[a.type] || a.type,
      subject: names.subjects.get(a.subject_id) || '',
      topic: names.topics.get(a.topic_id) || '',
      setAt: a.assigned_at,
      due: dueDayKey(a.due_at),
      completedAt: a.status === 'completed' ? a.completed_at : null,
      state,
      daysLate: (state === 'late' || state === 'overdue') ? late : null,
      result: resultOf(a, results),
      note: a.note || '',
    }
  })
}

export function summarizeHistory(rows) {
  const count = (s) => rows.filter((r) => r.state === s).length
  const done = count('on_time') + count('late') + count('done')
  const dated = count('on_time') + count('late')
  return {
    set: rows.length,
    done,
    onTime: count('on_time'),
    late: count('late'),
    overdue: count('overdue'),
    pending: count('pending'),
    cancelled: count('cancelled'),
    onTimePct: dated ? Math.round((count('on_time') / dated) * 100) : null,
  }
}

export function filterRows(rows, { group = 'all', subject = '', from = '', to = '' } = {}) {
  return rows.filter((r) => {
    if (group !== 'all' && STATES[r.state].group !== group && r.state !== group) return false
    if (subject && r.subject !== subject) return false
    const day = r.setAt.slice(0, 10)
    if (from && day < from) return false
    if (to && day > to) return false
    return true
  })
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows) {
  const header = ['Set on', 'Work', 'Type', 'Subject', 'Topic', 'Due', 'Status', 'Days late', 'Completed on', 'Result', 'Note']
  const lines = rows.map((r) => [
    r.setAt.slice(0, 10), r.title, r.type, r.subject, r.topic, r.due || '', STATES[r.state].label,
    r.daysLate ?? '', r.completedAt ? r.completedAt.slice(0, 10) : '', r.result?.text || '', r.note,
  ].map(csvCell).join(','))
  return [header.join(','), ...lines].join('\n')
}
