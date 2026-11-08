import { describe, it, expect } from 'vitest'
import { stateOf, resultOf, historyRows, summarizeHistory, filterRows, toCsv } from '../src/lib/history.js'

const now = new Date(2026, 10, 8, 12) // 8 Nov 2026, local noon
const a = (over) => ({ id: 'x', type: 'quiz', title: 'Quiz 1', status: 'pending', assigned_at: '2026-11-01T09:00:00Z', due_at: null, completed_at: null, ...over })
const empty = { quizSessions: new Map(), attempts: new Map(), tutorSessions: new Map() }
const names = { subjects: new Map([['s1', 'Maths']]), topics: new Map([['t1', 'Number']]) }

describe('stateOf', () => {
  it('pending with no date or a future date is not done yet', () => {
    expect(stateOf(a(), now)).toBe('pending')
    expect(stateOf(a({ due_at: '2026-11-10T00:00:00Z' }), now)).toBe('pending')
  })
  it('pending past its due day is overdue; due today is not', () => {
    expect(stateOf(a({ due_at: '2026-11-07T00:00:00Z' }), now)).toBe('overdue')
    expect(stateOf(a({ due_at: '2026-11-08T00:00:00Z' }), now)).toBe('pending')
  })
  it('completed on or before the due day is on time, after is late, undated is done', () => {
    expect(stateOf(a({ status: 'completed', due_at: '2026-11-05T00:00:00Z', completed_at: '2026-11-05T20:00:00' }), now)).toBe('on_time')
    expect(stateOf(a({ status: 'completed', due_at: '2026-11-05T00:00:00Z', completed_at: '2026-11-06T09:00:00' }), now)).toBe('late')
    expect(stateOf(a({ status: 'completed', completed_at: '2026-11-06T09:00:00' }), now)).toBe('done')
  })
  it('cancelled wins', () => {
    expect(stateOf(a({ status: 'cancelled', due_at: '2026-11-01T00:00:00Z' }), now)).toBe('cancelled')
  })
})

describe('resultOf', () => {
  it('shows a quiz score', () => {
    const r = resultOf(a({ status: 'completed', quiz_session_id: 'q' }), { ...empty, quizSessions: new Map([['q', { score: 7, question_count: 10 }]]) })
    expect(r).toEqual({ text: '7/10 (70%)', pct: 70 })
  })
  it("uses the parent's mark for written work and says what the AI gave", () => {
    const attempts = new Map([['w', { marks_awarded: 0, parent_marks: 1, total_marks: 3 }]])
    expect(resultOf(a({ type: 'written_test', status: 'completed', fm_attempt_id: 'w' }), { ...empty, attempts }).text).toBe('1/3 marks (AI gave 0)')
  })
  it('flags written work waiting for review', () => {
    const attempts = new Map([['w', { marks_awarded: 2, total_marks: 6, needs_review: true }]])
    expect(resultOf(a({ type: 'written_test', status: 'completed', fm_attempt_id: 'w' }), { ...empty, attempts }).text).toBe('2/6 marks (needs your review)')
  })
  it('summarises a tutor session; nothing for unfinished work', () => {
    const tutorSessions = new Map([['t', { message_count: 12, minutes_earned: 5 }]])
    expect(resultOf(a({ type: 'tutor_session', status: 'completed', tutor_session_id: 't' }), { ...empty, tutorSessions }).text).toBe('12 messages, 5 min earned')
    expect(resultOf(a({ quiz_session_id: 'q' }), empty)).toBeNull()
  })
})

describe('history rows, summary, filter and CSV', () => {
  const rows = historyRows([
    a({ id: '1', subject_id: 's1', topic_id: 't1', status: 'completed', due_at: '2026-11-05T00:00:00Z', completed_at: '2026-11-04T10:00:00' }),
    a({ id: '2', status: 'completed', due_at: '2026-11-03T00:00:00Z', completed_at: '2026-11-05T10:00:00' }),
    a({ id: '3', due_at: '2026-11-06T00:00:00Z', assigned_at: '2026-10-20T09:00:00Z' }),
    a({ id: '4' }),
    a({ id: '5', status: 'cancelled', title: 'Say "hi", then go' }),
  ], empty, names, now)

  it('builds rows with names and days late', () => {
    expect(rows[0]).toMatchObject({ subject: 'Maths', topic: 'Number', state: 'on_time', daysLate: null })
    expect(rows[1]).toMatchObject({ state: 'late', daysLate: 2 })
    expect(rows[2]).toMatchObject({ state: 'overdue', daysLate: 2 })
  })
  it('counts each outcome', () => {
    expect(summarizeHistory(rows)).toEqual({ set: 5, done: 2, onTime: 1, late: 1, overdue: 1, pending: 1, cancelled: 1, onTimePct: 50 })
  })
  it('filters by outcome group, single state, subject and date set', () => {
    expect(filterRows(rows, { group: 'not_done' }).map((r) => r.id)).toEqual(['3', '4'])
    expect(filterRows(rows, { group: 'overdue' }).map((r) => r.id)).toEqual(['3'])
    expect(filterRows(rows, { subject: 'Maths' }).map((r) => r.id)).toEqual(['1'])
    expect(filterRows(rows, { from: '2026-10-25' }).map((r) => r.id)).toEqual(['1', '2', '4', '5'])
  })
  it('writes CSV with quoting', () => {
    const csv = toCsv(rows).split('\n')
    expect(csv[0]).toBe('Set on,Work,Type,Subject,Topic,Due,Status,Days late,Completed on,Result,Note')
    expect(csv[1]).toBe('2026-11-01,Quiz 1,Quiz,Maths,Number,2026-11-05,Done on time,,2026-11-04,,')
    expect(csv[5]).toContain('"Say ""hi"", then go"')
  })
})
