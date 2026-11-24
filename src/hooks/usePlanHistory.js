import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

async function readAll(build, page = 1000) {
  const rows = []
  for (let from = 0; ; from += page) {
    const { data, error } = await build().range(from, from + page - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < page) return rows
  }
}

// What the student has done and has pending, shaped for proposeWork
// (src/lib/planProposal.js): topic scores, what's been tutored, attempted,
// quizzed, and what's already set.
export function usePlanHistory(studentId) {
  const [state, setState] = useState({ loading: true, error: null, history: null })

  const load = useCallback(async () => {
    if (!studentId) return
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [tutor, attempts, quizzes, assignments] = await Promise.all([
        readAll(() => supabase.from('tutor_sessions').select('subtopic_id, completed_at').eq('student_id', studentId).eq('reward_claimed', true).order('completed_at')),
        readAll(() => supabase.from('fm_attempts').select('question_id, marks_awarded, parent_marks, total_marks, fm_exam_questions (topic_id)').eq('student_id', studentId).order('submitted_at')),
        readAll(() => supabase.from('quiz_sessions').select('quiz_id, completed_at').eq('student_id', studentId).not('completed_at', 'is', null).order('completed_at')),
        readAll(() => supabase.from('assignments').select('type, status, subtopic_id, exam_question_id, quiz_id, paper_ref').eq('student_id', studentId).in('status', ['pending', 'completed']).order('assigned_at')),
      ])
      const tutoredAt = new Map()
      for (const t of tutor) if (t.subtopic_id && t.completed_at) tutoredAt.set(t.subtopic_id, new Date(t.completed_at).getTime())
      const quizzedAt = new Map()
      for (const q of quizzes) if (q.quiz_id) quizzedAt.set(q.quiz_id, new Date(q.completed_at).getTime())

      const sums = new Map()
      for (const a of attempts) {
        const topic = a.fm_exam_questions?.topic_id
        const marks = a.parent_marks ?? a.marks_awarded
        if (!topic || marks == null || !a.total_marks) continue
        const s = sums.get(topic) ?? { m: 0, t: 0 }
        s.m += marks
        s.t += a.total_marks
        sums.set(topic, s)
      }
      const topicScores = new Map([...sums].map(([k, v]) => [k, Math.round((100 * v.m) / v.t)]))

      const pending = assignments.filter((a) => a.status === 'pending')
      setState({
        loading: false,
        error: null,
        history: {
          topicScores,
          tutoredAt,
          quizzedAt,
          attemptedQuestions: new Set(attempts.map((a) => a.question_id)),
          pendingSubtopics: new Set(pending.filter((a) => a.type === 'tutor_session').map((a) => a.subtopic_id)),
          pendingQuestions: new Set(pending.filter((a) => a.type === 'written_test').map((a) => a.exam_question_id)),
          pendingQuizzes: new Set(pending.filter((a) => a.type === 'quiz').map((a) => a.quiz_id)),
          pendingPapers: new Set(pending.filter((a) => a.type === 'mock_paper').map((a) => a.paper_ref)),
          donePapers: new Set(assignments.filter((a) => a.type === 'mock_paper' && a.status === 'completed').map((a) => a.paper_ref)),
        },
      })
    } catch (err) {
      console.error('Failed to load plan history', err)
      setState({ loading: false, error: 'Could not load his history to propose work.', history: null })
    }
  }, [studentId])

  useEffect(() => { load() }, [load])
  return { ...state, reload: load }
}
