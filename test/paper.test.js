import { describe, it, expect } from 'vitest'
import { paperSummary, secondsLeft, fmtDuration } from '../src/lib/paper.js'

const questions = [
  { id: 'q1', total_marks: 2, topics: { name: 'Number' } },
  { id: 'q2', total_marks: 3, topics: { name: 'Algebra' } },
  { id: 'q3', total_marks: 5, topics: { name: 'Algebra' } },
  { id: 'q4', total_marks: 4, topics: { name: 'Number' } },
]

describe('paperSummary', () => {
  it('adds up marks, counts unanswered as 0 and uses the parent mark', () => {
    const s = paperSummary(questions, [
      { question_id: 'q1', marks_awarded: 2, minutes_earned: 2 },
      { question_id: 'q2', marks_awarded: 0, parent_marks: 1, minutes_earned: 0 },
      { question_id: 'q3', marks_awarded: 3, minutes_held: 3, needs_review: true },
    ])
    expect(s).toMatchObject({ answered: 3, questions: 4, marks: 6, available: 14, percent: 43, minutes: 2, held: 3, toReview: 1 })
  })
  it('breaks marks down by topic, biggest first', () => {
    const s = paperSummary(questions, [{ question_id: 'q3', marks_awarded: 4 }, { question_id: 'q4', marks_awarded: 4 }])
    expect(s.byTopic).toEqual([
      { topic: 'Algebra', marks: 4, available: 8 },
      { topic: 'Number', marks: 4, available: 6 },
    ])
  })
  it('handles a paper with nothing answered', () => {
    expect(paperSummary(questions, [])).toMatchObject({ answered: 0, marks: 0, percent: 0 })
  })
})

describe('paper clock', () => {
  const start = '2026-11-08T10:00:00Z'
  it('counts down from the time allowed, and goes negative when time is up', () => {
    expect(secondsLeft(null, 90)).toBe(5400)
    expect(secondsLeft(start, 90, Date.parse('2026-11-08T10:30:00Z'))).toBe(3600)
    expect(secondsLeft(start, 90, Date.parse('2026-11-08T11:35:00Z'))).toBe(-300)
  })
  it('formats as m:ss or h:mm:ss', () => {
    expect(fmtDuration(5400)).toBe('1:30:00')
    expect(fmtDuration(65)).toBe('1:05')
    expect(fmtDuration(-300)).toBe('5:00')
  })
})
