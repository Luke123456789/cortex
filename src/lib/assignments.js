export const ASSIGNMENT_TYPE_LABELS = {
  quiz: 'Quiz',
  tutor_session: 'Tutor session',
  written_test: 'Written test',
  past_paper: 'Past paper',
  mock_paper: 'Mock paper',
  study_pack: 'Study pack',
}

// Returns { label, to } for assignment types with a live student-facing flow
// to jump into, or null when there's nothing to start yet (past_paper has no
// submission UI built).
export function assignmentAction(assignment) {
  if (assignment.isPack) {
    // A pack that isn't the current one for its subject can be looked at, not started.
    if (!assignment.isCurrent) return { label: 'Preview', to: `/pack/${assignment.packId}` }
    return { label: assignment.progress?.done ? 'Continue' : 'Start pack', to: `/pack/${assignment.packId}` }
  }
  if (assignment.type === 'quiz') return { label: 'Start quiz', to: `/play/${assignment.quiz_id}?assignment=${assignment.id}` }
  if (assignment.type === 'tutor_session') return { label: 'Start session', to: `/tutor?subtopicId=${assignment.subtopic_id}&assignment=${assignment.id}` }
  if (assignment.type === 'written_test' && assignment.exam_question_id) return { label: 'Start answer', to: `/written/${assignment.exam_question_id}?assignment=${assignment.id}` }
  if (assignment.type === 'mock_paper') return { label: 'Open paper', to: `/paper/${assignment.id}` }
  return null
}
