import { describe, it, expect } from 'vitest'
import { SECONDS_PER_CORRECT_ANSWER, computeReward, gradeAnswers } from '../supabase/functions/grade-quiz-session/quiz-grading-logic.js'

describe('computeReward', () => {
  it('awards nothing for zero correct answers', () => {
    expect(computeReward(0)).toBe(0)
  })

  it('rounds to the nearest minute at 30 seconds per correct answer', () => {
    expect(SECONDS_PER_CORRECT_ANSWER).toBe(30)
    expect(computeReward(2)).toBe(1) // 60s -> 1 min
    expect(computeReward(4)).toBe(2) // 120s -> 2 min
  })

  it('floors to a minimum of 1 minute whenever at least one answer is correct', () => {
    expect(computeReward(1)).toBe(1) // 30s would round to 0, floored to 1
  })

  it('never returns a negative reward', () => {
    expect(computeReward(-3)).toBe(0)
  })
})

describe('gradeAnswers', () => {
  const questions = [
    { id: 'q1', correct_option: 'A', explanation: 'because A' },
    { id: 'q2', correct_option: 'C', explanation: 'because C' },
    { id: 'q3', correct_option: 'B', explanation: 'because B' },
  ]

  it('grades a mix of correct and incorrect answers', () => {
    const answers = [
      { questionId: 'q1', selectedOption: 'A' },
      { questionId: 'q2', selectedOption: 'D' },
      { questionId: 'q3', selectedOption: 'B' },
    ]
    const { results, correctCount, totalCount } = gradeAnswers(questions, answers)
    expect(correctCount).toBe(2)
    expect(totalCount).toBe(3)
    expect(results.find((r) => r.questionId === 'q1').correct).toBe(true)
    expect(results.find((r) => r.questionId === 'q2').correct).toBe(false)
    expect(results.find((r) => r.questionId === 'q3').correct).toBe(true)
  })

  it('treats a missing answer as incorrect, not a crash', () => {
    const answers = [{ questionId: 'q1', selectedOption: 'A' }]
    const { results, correctCount } = gradeAnswers(questions, answers)
    expect(correctCount).toBe(1)
    expect(results.find((r) => r.questionId === 'q2').selectedOption).toBeNull()
    expect(results.find((r) => r.questionId === 'q2').correct).toBe(false)
  })

  it('is case-insensitive on the selected option letter', () => {
    const answers = [{ questionId: 'q1', selectedOption: 'a' }]
    const { results } = gradeAnswers(questions, answers)
    expect(results.find((r) => r.questionId === 'q1').correct).toBe(true)
  })

  it('ignores malformed answer entries instead of throwing', () => {
    const answers = [null, { selectedOption: 'A' }, { questionId: 'q1', selectedOption: 'A' }]
    expect(() => gradeAnswers(questions, answers)).not.toThrow()
    const { correctCount } = gradeAnswers(questions, answers)
    expect(correctCount).toBe(1)
  })

  it('always exposes the correct option and explanation for review, win or lose', () => {
    const { results } = gradeAnswers(questions, [{ questionId: 'q2', selectedOption: 'D' }])
    const q2 = results.find((r) => r.questionId === 'q2')
    expect(q2.correctOption).toBe('C')
    expect(q2.explanation).toBe('because C')
  })
})
