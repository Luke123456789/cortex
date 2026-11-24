import { describe, it, expect } from 'vitest'
import { mondayOf, shiftWeek, weekBounds, computeProgress, targetRows, planShareText, fmtMinutes } from '../src/lib/weeklyPlan.js'

describe('week arithmetic', () => {
  it('finds the Monday of the week', () => {
    expect(mondayOf(new Date(2026, 10, 23, 21))).toBe('2026-11-23') // Monday
    expect(mondayOf(new Date(2026, 10, 29, 23))).toBe('2026-11-23') // Sunday
    expect(mondayOf(new Date(2026, 10, 30, 0, 5))).toBe('2026-11-30')
  })
  it('crosses month and year boundaries', () => {
    expect(shiftWeek('2026-12-28', 1)).toBe('2027-01-04')
    expect(shiftWeek('2026-11-02', -1)).toBe('2026-10-26')
  })
})

describe('computeProgress', () => {
  const bounds = weekBounds('2026-11-23')
  const at = (d, h = 18, m = 0) => new Date(2026, 10, d, h, m).toISOString()
  const activity = {
    tutorSessions: [
      { started_at: at(23, 18), completed_at: at(23, 18, 20), reward_claimed: true, subject_id: 'bio' },
      { started_at: at(24, 18), completed_at: at(25, 9), reward_claimed: true, subject_id: 'phy' }, // left open: capped
      { started_at: at(24, 18), completed_at: at(24, 18, 5), reward_claimed: false, subject_id: 'eco' }, // not finished
      { started_at: at(16, 18), completed_at: at(16, 18, 20), reward_claimed: true, subject_id: 'bio' }, // last week
    ],
    attempts: [
      { submitted_at: at(24, 19), active_ms: 10 * 60000, marks: 3, total: 6, subject_id: 'eco' },
      { submitted_at: at(24, 19, 30), active_ms: 5 * 60000, marks: 4, total: 4, subject_id: 'eco' },
    ],
    quizzes: [{ started_at: at(26), completed_at: at(26), question_count: 10, score: 9, subject_id: 'bio' }],
  }
  const p = computeProgress(activity, bounds)

  it('counts only finished work inside the week', () => {
    expect(p.tutorSessions).toBe(2)
    expect(p.examQuestions).toBe(2)
    expect(p.quizzes).toBe(1)
  })
  it('estimates minutes with a cap on long sessions', () => {
    expect(p.minutes).toBe(20 + 45 + 15 + 5)
  })
  it('tracks subjects, days and average mark', () => {
    expect([...p.subjects].sort()).toEqual(['bio', 'eco', 'phy'])
    expect(p.daysActive).toBe(4) // Mon, Tue, Wed (session finished next morning), Thu
    expect(p.examPct).toBe(70)
  })
})

describe('targetRows and share text', () => {
  const plan = { study_minutes: 240, tutor_sessions: 3, exam_questions: 10, quizzes: 0, note: 'Focus on 6-markers' }
  const progress = { minutes: 250, tutorSessions: 1, examQuestions: 10, quizzes: 4, subjects: new Set(), daysActive: 3, examPct: 55 }

  it('only lists targets that were set', () => {
    const rows = targetRows(plan, progress)
    expect(rows.map((r) => r.key)).toEqual(['study_minutes', 'tutor_sessions', 'exam_questions'])
    expect(rows.find((r) => r.key === 'tutor_sessions').met).toBe(false)
    expect(rows.find((r) => r.key === 'study_minutes').met).toBe(true)
  })

  it('writes the plan without progress', () => {
    const t = planShareText({ plan, name: 'James', subjectNames: [{ name: 'Biology' }], weekStart: '2026-11-23' })
    expect(t).toContain("James's revision plan")
    expect(t).toContain('• Study time: 4h')
    expect(t).toContain('Focus subjects: Biology')
    expect(t).toContain('Note: Focus on 6-markers')
    expect(t).not.toContain('✅')
  })

  it('writes a check-in with progress', () => {
    const t = planShareText({
      plan, name: 'James', progress, weekStart: '2026-11-23',
      subjectNames: [{ name: 'Biology', covered: true }, { name: 'History', covered: false }],
    })
    expect(t).toContain('✅ Study time: 4h 10m of 4h')
    expect(t).toContain('⬜ Tutor sessions: 1 of 3')
    expect(t).toContain('Not touched yet: History')
    expect(t).toContain('Days worked: 3 of 7')
    expect(t).toContain('55%')
  })

  it('handles a week with no plan', () => {
    expect(planShareText({ plan: null, weekStart: '2026-11-23' })).toContain('No plan set')
  })

  it('formats minutes', () => {
    expect(fmtMinutes(45)).toBe('45 min')
    expect(fmtMinutes(90)).toBe('1h 30m')
  })
})

describe('per-subject time, papers and set work', () => {
  const subjects = [{ id: 'phy', name: 'Physics' }, { id: 'mat', name: 'Maths' }]
  const plan = { subject_minutes: { phy: 120, mat: 90 }, tutor_sessions: 4, exam_questions: 5, papers: 2, quizzes: 0, study_minutes: 0 }
  const progress = { minutes: 100, minutesBySubject: { phy: 130, mat: 20 }, tutorSessions: 1, examQuestions: 5, papers: 1, quizzes: 0, subjects: new Set(), daysActive: 2, examPct: null }

  it('has a time row per subject and a papers row', () => {
    const rows = targetRows(plan, progress, subjects)
    expect(rows.map((r) => r.key)).toEqual(['time:phy', 'time:mat', 'tutor_sessions', 'exam_questions', 'papers'])
    expect(rows[0]).toMatchObject({ label: 'Physics time', met: true, doneText: '2h 10m', targetText: '2h' })
    expect(rows[1]).toMatchObject({ label: 'Maths time', met: false, doneText: '20 min' })
    expect(rows[4]).toMatchObject({ label: 'Exam papers', done: 1, target: 2, met: false })
  })

  it('lists the set work in the share text, ticked when done', () => {
    const items = [{ title: 'Forces tutor session', status: 'completed' }, { title: 'Physics Paper 1: Mock 2', status: 'pending' }]
    const plain = planShareText({ plan, subjects, items, weekStart: '2026-11-23' })
    expect(plain).toContain('• Physics time: 2h')
    expect(plain).toContain('• Forces tutor session')
    const checkin = planShareText({ plan, subjects, items, progress, weekStart: '2026-11-23' })
    expect(checkin).toContain('✅ Physics time: 2h 10m of 2h')
    expect(checkin).toContain('✅ Forces tutor session')
    expect(checkin).toContain('⬜ Physics Paper 1: Mock 2')
  })

  it('counts papers completed in the week and minutes per subject', () => {
    const bounds = weekBounds('2026-11-23')
    const at = (d) => new Date(2026, 10, d, 18).toISOString()
    const p = computeProgress({
      tutorSessions: [{ started_at: at(23), completed_at: new Date(2026, 10, 23, 18, 30).toISOString(), reward_claimed: true, subject_id: 'phy' }],
      attempts: [{ submitted_at: at(24), active_ms: 600000, subject_id: 'mat' }],
      quizzes: [],
      papers: [{ completed_at: at(25) }, { completed_at: at(16) }],
    }, bounds)
    expect(p.minutesBySubject).toEqual({ phy: 30, mat: 10 })
    expect(p.papers).toBe(1)
  })
})
