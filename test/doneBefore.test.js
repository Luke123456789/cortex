import { describe, it, expect } from 'vitest'
import { doneIndex, doneSentence } from '../src/lib/doneBefore.js'

describe('doneIndex', () => {
  const index = doneIndex({
    quizSessions: [
      { quiz_id: 'q1', score: 14, question_count: 20, completed_at: '2026-11-06T10:00:00Z' },
      { quiz_id: 'q1', score: 18, question_count: 20, completed_at: '2026-11-07T10:00:00Z' },
      { quiz_id: 'q2', score: 5, question_count: 10, completed_at: null },
      { quiz_id: null, score: 3, question_count: 5, completed_at: '2026-11-07T10:00:00Z' },
    ],
    attempts: [
      { question_id: 'w1', marks_awarded: 0, parent_marks: 1, total_marks: 3, submitted_at: '2026-11-08T15:57:00Z' },
    ],
    tutorSessions: [
      { subtopic_id: 's1', completed_at: '2026-11-07T09:00:00Z' },
      { subtopic_id: 's2', completed_at: null },
    ],
  })

  it('counts finished quizzes and keeps the latest score', () => {
    expect(index.quiz.get('q1')).toEqual({ count: 2, lastAt: '2026-11-07T10:00:00Z', lastResult: '18/20' })
  })
  it('ignores unfinished work and sessions with no quiz', () => {
    expect(index.quiz.has('q2')).toBe(false)
    expect(index.quiz.size).toBe(1)
    expect(index.tutor.has('s2')).toBe(false)
  })
  it("uses the parent's mark for written answers", () => {
    expect(index.written.get('w1').lastResult).toBe('1/3 marks')
  })
  it('records tutor lessons by subtopic', () => {
    expect(index.tutor.get('s1')).toMatchObject({ count: 1, lastResult: null })
  })
})

describe('doneSentence', () => {
  it('says once, twice or n times with the latest result', () => {
    expect(doneSentence({ count: 1, lastAt: '2026-11-06T10:00:00', lastResult: '14/20' }, 'James')).toMatch(/^James has already done this on (\d+ Nov|Nov \d+) \(14\/20\)\.$/)
    expect(doneSentence({ count: 2, lastAt: '2026-11-06T10:00:00', lastResult: null }, 'James')).toMatch(/^James has already done this twice, last on (\d+ Nov|Nov \d+)\.$/)
    expect(doneSentence({ count: 4, lastAt: '2026-11-06T10:00:00', lastResult: null })).toMatch(/4 times/)
    expect(doneSentence(undefined)).toBeNull()
  })
})
