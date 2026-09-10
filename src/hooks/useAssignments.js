import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAssignments() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAssignments = useCallback(async () => {
    const { data, error } = await supabase
      .from('assignments')
      .select('id, type, title, note, due_at, assigned_at, status, completed_at, quiz_id, subtopic_id')
      .order('assigned_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Failed to load assignments', error)
    } else {
      setAssignments(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAssignments()

    const channel = supabase
      .channel('assignments_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments' },
        () => fetchAssignments()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAssignments])

  return { assignments, loading, refresh: fetchAssignments }
}
