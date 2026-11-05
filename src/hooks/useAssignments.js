import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

// studentId: whose rows to show (see useAuth). Nothing loads until it's known.
export function useAssignments(studentId) {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAssignments = useCallback(async () => {
    const { data, error } = await supabase
      .from('assignments')
      .select('id, type, title, note, due_at, assigned_at, status, completed_at, quiz_id, subtopic_id, exam_question_id, fm_attempt_id')
      .eq('student_id', studentId)
      .order('assigned_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Failed to load assignments', error)
    } else {
      setAssignments(data)
    }
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    if (!studentId) return
    fetchAssignments()

    const channel = supabase
      .channel(`assignments_changes_${studentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments', filter: `student_id=eq.${studentId}` },
        () => fetchAssignments()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAssignments])

  return { assignments, loading, refresh: fetchAssignments }
}
