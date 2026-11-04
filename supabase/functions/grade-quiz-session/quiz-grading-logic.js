// Pure logic shared between the Deno edge function (index.ts) and the Vitest
// unit tests in test/quiz-grading-logic.test.js. No Deno-specific APIs here
// so it can be imported and tested directly under Node.
//
// Quiz answers are objectively right or wrong (multiple choice against a
// fixed answer key), unlike tutor session transcripts or written test
// answers — so grading is deterministic here, not an LLM call.

// Matches the reward rate this app used before the live quiz flow was
// pulled during the reward-exploit cleanup (see the "Reduce quiz reward to
// 30 seconds per correct answer" history).
export const SECONDS_PER_CORRECT_ANSWER = 30

export function computeReward(correctCount) {
  if (correctCount <= 0) return 0
  return Math.max(1, Math.round((correctCount * SECONDS_PER_CORRECT_ANSWER) / 60))
}

// quiz_questions rows (with an embedded `questions` object) -> the questions
// to grade. Deactivated questions are skipped: RLS already hides them from the
// student's quiz screen, so grading them would count an unseen question as
// wrong. The grader runs as service role, so it has to filter them itself.
export function activeQuizQuestions(rows) {
  return (rows || []).map((r) => r && r.questions).filter((q) => q && q.active !== false)
}

// questions: [{ id, correct_option, explanation }], answers: [{ questionId, selectedOption }]
export function gradeAnswers(questions, answers) {
  const answerByQuestionId = {}
  for (const a of answers || []) {
    if (a && typeof a.questionId === 'string') answerByQuestionId[a.questionId] = a.selectedOption
  }

  const results = questions.map((q) => {
    const selected = answerByQuestionId[q.id] ?? null
    const correct = typeof selected === 'string' && selected.toUpperCase() === q.correct_option
    return {
      questionId: q.id,
      selectedOption: selected,
      correct,
      correctOption: q.correct_option,
      explanation: q.explanation ?? null,
    }
  })

  const correctCount = results.filter((r) => r.correct).length
  return { results, correctCount, totalCount: questions.length }
}
