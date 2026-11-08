import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { doneIndex } from '../lib/doneBefore'

const PAGE = 1000

async function readAll(build) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
}

// Finished quizzes, written answers and tutor lessons for one student, so
// Assign work can say "already done". Read with the parent's session.
export function useDoneBefore(studentId) {
  const [raw, setRaw] = useState(null)

  useEffect(() => {
    if (!studentId) return
    let cancelled = false
    setRaw(null)
    Promise.all([
      readAll(() => supabase.from('quiz_sessions').select('quiz_id, score, question_count, completed_at').eq('student_id', studentId).not('completed_at', 'is', null)),
      readAll(() => supabase.from('fm_attempts').select('question_id, marks_awarded, parent_marks, total_marks, submitted_at').eq('student_id', studentId)),
      readAll(() => supabase.from('tutor_sessions').select('subtopic_id, completed_at').eq('student_id', studentId).not('completed_at', 'is', null)),
    ])
      .then(([quizSessions, attempts, tutorSessions]) => { if (!cancelled) setRaw({ quizSessions, attempts, tutorSessions }) })
      .catch((err) => console.error('Failed to load work already done', err))
    return () => { cancelled = true }
  }, [studentId])

  return useMemo(() => (raw ? doneIndex(raw) : null), [raw])
}
