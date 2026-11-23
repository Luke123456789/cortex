import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { computeProgress, weekBounds } from '../lib/weeklyPlan'

// A student's plan for one week plus their actual activity in it. Works for
// the student (own rows) and a linked parent (RLS: is_parent_of).
export function useWeeklyPlan(studentId, weekStart) {
  const [state, setState] = useState({ loading: true, error: null, plan: null, subjects: [], progress: null })

  const load = useCallback(async () => {
    if (!studentId) return
    setState((s) => ({ ...s, loading: true, error: null }))
    const bounds = weekBounds(weekStart)
    const from = bounds.from.toISOString()
    const to = bounds.to.toISOString()
    try {
      const [plan, subjects, tutor, attempts, quizzes] = await Promise.all([
        supabase.from('weekly_plans').select('*').eq('student_id', studentId).eq('week_start', weekStart).maybeSingle(),
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('tutor_sessions')
          .select('started_at, completed_at, reward_claimed, subtopics (topics (subject_id))')
          .eq('student_id', studentId).gte('completed_at', from).lt('completed_at', to),
        supabase.from('fm_attempts')
          .select('submitted_at, integrity, marks_awarded, parent_marks, total_marks, fm_exam_questions (topics (subject_id))')
          .eq('student_id', studentId).gte('submitted_at', from).lt('submitted_at', to),
        supabase.from('quiz_sessions')
          .select('started_at, completed_at, question_count, score, topics (subject_id), quizzes (topics (subject_id))')
          .eq('student_id', studentId).gte('completed_at', from).lt('completed_at', to),
      ])
      const failed = [plan, subjects, tutor, attempts, quizzes].find((r) => r.error)
      if (failed) throw failed.error

      const activity = {
        tutorSessions: tutor.data.map((s) => ({ ...s, subject_id: s.subtopics?.topics?.subject_id ?? null })),
        attempts: attempts.data.map((a) => ({
          submitted_at: a.submitted_at,
          active_ms: a.integrity?.typing?.activeMs ?? 0,
          marks: a.parent_marks ?? a.marks_awarded,
          total: a.total_marks,
          subject_id: a.fm_exam_questions?.topics?.subject_id ?? null,
        })),
        quizzes: quizzes.data.map((q) => ({ ...q, subject_id: q.topics?.subject_id ?? q.quizzes?.topics?.subject_id ?? null })),
      }
      setState({ loading: false, error: null, plan: plan.data, subjects: subjects.data, progress: computeProgress(activity, bounds) })
    } catch (err) {
      console.error('Failed to load weekly plan', err)
      setState((s) => ({ ...s, loading: false, error: 'Could not load the weekly plan.' }))
    }
  }, [studentId, weekStart])

  useEffect(() => { load() }, [load])

  return { ...state, reload: load }
}
