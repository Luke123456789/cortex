import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

// studentId: whose rows to show (see useAuth). Nothing loads until it's known.
export function useRedemptions(studentId) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('redemption_requests')
      .select('*')
      .eq('student_id', studentId)
      .order('requested_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Failed to load redemption requests', error)
    } else {
      setRequests(data)
    }
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    if (!studentId) return
    fetchRequests()

    const channel = supabase
      .channel(`redemption_requests_changes_${studentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'redemption_requests', filter: `student_id=eq.${studentId}` },
        () => fetchRequests()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchRequests])

  const pending = requests.find((r) => r.status === 'pending') || null

  return { requests, pending, loading, refresh: fetchRequests }
}
