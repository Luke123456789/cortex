import { describe, it, expect } from 'vitest'
import {
  dayIndex,
  dayWindows,
  bucketByDay,
  summarize,
  summaryLines,
  trendLabel,
  subjectQuality,
  niceScale,
} from '../src/lib/analytics.js'

// Midday local time so day maths doesn't depend on the test machine's zone.
const local = (y, m, d, h = 12) => new Date(y, m - 1, d, h).toISOString()
const now = new Date(2026, 10, 5, 15) // 5 Nov 2026, 15:00 local

const subjects = [
  { id: 'bio', name: 'Biology', exam_board: 'AQA' },
  { id: 'chem', name: 'Chemistry', exam_board: 'AQA' },
  { id: 'pe', name: 'Physical Education', exam_board: 'OCR' },
]
const topics = [
  { id: 'cells', subject_id: 'bio' },
  { id: 'atoms', subject_id: 'chem' },
  { id: 'skel', subject_id: 'pe' },
]
const subtopics = [{ id: 'cells-1', topic_id: 'cells' }, { id: 'skel-1', topic_id: 'skel' }]

describe('day maths', () => {
  it('counts whole local days back from today', () => {
    expect(dayIndex(local(2026, 11, 5, 1), now)).toBe(0)
    expect(dayIndex(local(2026, 11, 4, 23), now)).toBe(1)
    expect(dayIndex(local(2026, 10, 29), now)).toBe(7)
  })

  it('builds two 7-day windows ending today', () => {
    const { current, previous } = dayWindows(now)
    expect(current).toHaveLength(7)
    expect(current[6].getDate()).toBe(5)
    expect(current[0].getDate()).toBe(30)
    expect(previous[6].getDate()).toBe(29)
    expect(previous[0].getDate()).toBe(23)
  })

  it('buckets values into current and previous days, ignoring older rows', () => {
    const rows = [
      { at: local(2026, 11, 5), n: 3 },
      { at: local(2026, 11, 5, 9), n: 2 },
      { at: local(2026, 10, 30), n: 4 },
      { at: local(2026, 10, 29), n: 7 },
      { at: local(2026, 10, 1), n: 100 },
      { at: null, n: 1 },
    ]
    const b = bucketByDay(rows, (r) => r.at, (r) => r.n, now)
    expect(b.current).toEqual([4, 0, 0, 0, 0, 0, 5])
    expect(b.previous).toEqual([0, 0, 0, 0, 0, 0, 7])
  })
})

describe('summarize', () => {
  const quizSessions = [
    { topic_id: 'cells', score: 15, question_count: 20, completed_at: local(2026, 11, 4) },
    { topic_id: 'cells', score: 10, question_count: 20, completed_at: local(2026, 10, 25) },
    { topic_id: 'cells', score: 10, question_count: 20, completed_at: null },
  ]
  const tutorSessions = [{ subtopic_id: 'skel-1', minutes_earned: 12, completed_at: local(2026, 9, 1) }]
  const ledger = [
    { type: 'earn', amount_minutes: 6, created_at: local(2026, 11, 4) },
    { type: 'spend', amount_minutes: 20, created_at: local(2026, 11, 3) },
    { type: 'earn', amount_minutes: 4, created_at: local(2026, 10, 25) },
  ]

  it('totals the two windows and finds the last activity', () => {
    const s = summarize({ subjects, topics, subtopics, quizSessions, tutorSessions, ledger, now })
    expect(s.current).toMatchObject({ quizzes: 1, questions: 20, accuracy: 75, minutesEarned: 6, minutesRedeemed: 20, subjects: ['Biology'] })
    expect(s.previous).toMatchObject({ quizzes: 1, questions: 20, accuracy: 50, minutesEarned: 4 })
    expect(s.lastActive).toMatchObject({ kind: 'quiz', subject: 'Biology', daysAgo: 1 })
    expect(s.neglected.map((n) => n.name)).toEqual(['Chemistry', 'Physical Education'])
    expect(s.neglected.find((n) => n.name === 'Chemistry').lastActive).toBeNull()
  })

  it('writes plain-English lines', () => {
    const s = summarize({ subjects, topics, subtopics, quizSessions, tutorSessions, ledger, now })
    const lines = summaryLines(s, 'James')
    expect(lines[0]).toBe('James did 1 quiz (20 questions, 75% correct) in the last 7 days, in Biology.')
    expect(lines[1]).toBe('About the same as the previous 7 days.')
    expect(lines).toContain('Never started: Chemistry.')
    expect(lines).toContain('Nothing for over 30 days: Physical Education.')
  })

  it('says when there has been nothing recently', () => {
    const s = summarize({ subjects, topics, subtopics, quizSessions: [], tutorSessions, ledger: [], now })
    expect(summaryLines(s)[0]).toMatch(/^No quizzes or tutor sessions in the last 7 days\. Last active \d+ days ago \(tutor session, Physical Education\)\.$/)
  })
})

describe('trendLabel', () => {
  it('needs enough answers in both windows', () => {
    expect(trendLabel({ answers: 9, accuracy: 90 }, { answers: 50, accuracy: 50 })).toBe('not-enough')
  })
  it('calls improving, slipping and steady on a 5-point threshold', () => {
    expect(trendLabel({ answers: 20, accuracy: 80 }, { answers: 20, accuracy: 75 })).toBe('improving')
    expect(trendLabel({ answers: 20, accuracy: 70 }, { answers: 20, accuracy: 75 })).toBe('slipping')
    expect(trendLabel({ answers: 20, accuracy: 77 }, { answers: 20, accuracy: 75 })).toBe('steady')
  })
})

describe('subjectQuality', () => {
  const quizSessions = [
    { topic_id: 'cells', score: 18, question_count: 20, completed_at: local(2026, 11, 1) },
    { topic_id: 'cells', score: 12, question_count: 20, completed_at: local(2026, 10, 1) },
  ]
  const tutorSessions = [
    { subtopic_id: 'cells-1', minutes_earned: 15, completed_at: local(2026, 11, 2) },
    { subtopic_id: 'cells-1', minutes_earned: 30, completed_at: local(2026, 11, 3) },
  ]
  const q = (difficulty, question_type) => ({ difficulty, question_type, topic_id: 'cells' })
  const history = [
    { seen_at: local(2026, 11, 1), answered_correctly: true, questions: q('higher', 'applied') },
    { seen_at: local(2026, 11, 1), answered_correctly: false, questions: q('higher', 'recall') },
    { seen_at: local(2026, 11, 1), answered_correctly: true, questions: q('foundation', 'calculation') },
    { seen_at: local(2026, 11, 1), answered_correctly: true, questions: null },
  ]

  it('compares windows, splits by tier and type, and rates tutor sessions', () => {
    const rows = subjectQuality({ subjects, topics, subtopics, quizSessions, tutorSessions, history, days: 30, now })
    const bio = rows.find((r) => r.subjectId === 'bio')
    expect(bio.current).toMatchObject({ quizzes: 1, answers: 20, accuracy: 90 })
    expect(bio.previous).toMatchObject({ quizzes: 1, answers: 20, accuracy: 60 })
    expect(bio.trend).toBe('improving')
    expect(bio.higher).toEqual({ answers: 2, accuracy: 50 })
    expect(bio.applied).toEqual({ answers: 2, accuracy: 100 })
    expect(bio.tutor).toEqual({ sessions: 2, rating: 75 })
    expect(bio.allTime).toEqual({ answers: 40, accuracy: 75 })
    expect(bio.weekly).toHaveLength(12)
    expect(bio.weekly[11]).toBe(90)
    expect(bio.hasAnyActivity).toBe(true)
    expect(rows.find((r) => r.subjectId === 'chem').hasAnyActivity).toBe(false)
  })
})

describe('niceScale', () => {
  it('rounds the axis up to a clean step', () => {
    expect(niceScale(0)).toEqual({ max: 4, step: 1 })
    expect(niceScale(7)).toEqual({ max: 8, step: 2 })
    expect(niceScale(43)).toEqual({ max: 60, step: 20 })
    expect(niceScale(100)).toEqual({ max: 100, step: 25 })
  })
})
