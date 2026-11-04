import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

// studentId: whose rows to show (see useAuth). Nothing loads until it's known.
export function useAssessments(studentId) {
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAssessments = useCallback(async () => {
    const { data, error } = await supabase
      .from('assessments')
      .select('id, time_window, requested_at, status, result, subjects (name)')
      .eq('student_id', studentId)
      .order('requested_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Failed to load assessments', error)
    } else {
      setAssessments(data)
    }
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    if (!studentId) return
    fetchAssessments()

    const channel = supabase
      .channel(`assessments_changes_${studentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assessments', filter: `student_id=eq.${studentId}` },
        () => fetchAssessments()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAssessments])

  return { assessments, loading, refresh: fetchAssessments }
}
