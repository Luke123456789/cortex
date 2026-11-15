import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

// A student's study packs. A pack's status only changes when one of its
// steps (an assignment) changes, so pass the assignments list as `changed`
// and the packs reload with it.
export function useStudyPacks(studentId, changed) {
  const [packs, setPacks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPacks = useCallback(async () => {
    const { data, error } = await supabase
      .from('study_packs')
      .select('id, subject_id, topic_id, title, note, due_at, assigned_at, queue_position, status, completed_at')
      .eq('student_id', studentId)
      .order('assigned_at', { ascending: false })
      .limit(100)
    if (error) console.error('Failed to load study packs', error)
    else setPacks(data)
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    if (!studentId) return
    fetchPacks()
  }, [fetchPacks, changed])

  return { packs, loading, refresh: fetchPacks }
}
