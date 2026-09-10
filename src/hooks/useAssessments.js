import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAssessments() {
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAssessments = useCallback(async () => {
    const { data, error } = await supabase
      .from('assessments')
      .select('id, time_window, requested_at, status, result, subjects (name)')
      .order('requested_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Failed to load assessments', error)
    } else {
      setAssessments(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAssessments()

    const channel = supabase
      .channel('assessments_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assessments' },
        () => fetchAssessments()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAssessments])

  return { assessments, loading, refresh: fetchAssessments }
}
