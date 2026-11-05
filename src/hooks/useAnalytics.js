import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const DAY = 24 * 60 * 60 * 1000
// Long enough for a 90-day quality window, the 90 days before it, and the
// 12-week sparkline.
const HISTORY_DAYS = 185
const PAGE = 1000

// Reads every page of a query (PostgREST returns at most 1000 rows a time).
async function readAll(build) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
}

// Everything the parent Analytics page needs about one student, read with the
// parent's own session (RLS: is_parent_of). Transcripts are not loaded.
export function useAnalytics(studentId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    setError(null)
    const since = new Date(Date.now() - HISTORY_DAYS * DAY).toISOString()
    try {
      const [subjects, topics, subtopics, quizSessions, tutorSessions, ledger, history] = await Promise.all([
        readAll(() => supabase.from('subjects').select('id, name, exam_board').order('name')),
        readAll(() => supabase.from('topics').select('id, subject_id, name').order('id')),
        readAll(() => supabase.from('subtopics').select('id, topic_id').order('id')),
        readAll(() => supabase.from('quiz_sessions')
          .select('id, topic_id, quiz_id, score, question_count, completed_at')
          .eq('student_id', studentId).not('completed_at', 'is', null).order('completed_at')),
        readAll(() => supabase.from('tutor_sessions')
          .select('id, subtopic_id, minutes_earned, completed_at')
          .eq('student_id', studentId).not('completed_at', 'is', null).order('completed_at')),
        readAll(() => supabase.from('ledger_entries')
          .select('id, type, amount_minutes, created_at')
          .eq('student_id', studentId).gte('created_at', since).order('created_at')),
        readAll(() => supabase.from('student_question_history')
          .select('id, seen_at, answered_correctly, questions (difficulty, question_type, topic_id)')
          .eq('student_id', studentId).gte('seen_at', since).order('seen_at')),
      ])
      setData({ subjects, topics, subtopics, quizSessions, tutorSessions, ledger, history })
    } catch (err) {
      console.error('Failed to load analytics', err)
      setError('Could not load the analytics. Try again.')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refresh: load }
}
