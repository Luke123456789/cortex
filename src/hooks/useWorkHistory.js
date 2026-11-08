import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

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

// Reads in chunks so long id lists stay inside URL limits.
async function byIds(table, columns, ids) {
  const out = new Map()
  const unique = [...new Set(ids.filter(Boolean))]
  for (let i = 0; i < unique.length; i += 150) {
    const { data, error } = await supabase.from(table).select(columns).in('id', unique.slice(i, i + 150))
    if (error) throw error
    for (const row of data) out.set(row.id, row)
  }
  return out
}

// Every assignment ever set for a student (not just the latest 100), plus the
// quiz sessions, written attempts and tutor sessions that completed them.
// Read with the parent's session (RLS: is_parent_of).
export function useWorkHistory(studentId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    setError(null)
    try {
      const [assignments, subjects, topics] = await Promise.all([
        readAll(() => supabase.from('assignments')
          .select('id, type, title, note, due_at, assigned_at, status, completed_at, subject_id, topic_id, quiz_session_id, fm_attempt_id, tutor_session_id')
          .eq('student_id', studentId)
          .order('assigned_at', { ascending: false })),
        readAll(() => supabase.from('subjects').select('id, name').order('name')),
        readAll(() => supabase.from('topics').select('id, name').order('id')),
      ])
      const [quizSessions, attempts, tutorSessions] = await Promise.all([
        byIds('quiz_sessions', 'id, score, question_count', assignments.map((a) => a.quiz_session_id)),
        byIds('fm_attempts', 'id, marks_awarded, parent_marks, total_marks, needs_review, reward_decision', assignments.map((a) => a.fm_attempt_id)),
        byIds('tutor_sessions', 'id, message_count, minutes_earned', assignments.map((a) => a.tutor_session_id)),
      ])
      setData({
        assignments,
        results: { quizSessions, attempts, tutorSessions },
        names: { subjects: new Map(subjects.map((s) => [s.id, s.name])), topics: new Map(topics.map((t) => [t.id, t.name])) },
      })
    } catch (err) {
      console.error('Failed to load work history', err)
      setError('Could not load the work history. Try refreshing.')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error }
}
