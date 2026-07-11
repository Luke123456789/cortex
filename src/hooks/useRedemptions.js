import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useRedemptions() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('redemption_requests')
      .select('*')
      .order('requested_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Failed to load redemption requests', error)
    } else {
      setRequests(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRequests()

    const channel = supabase
      .channel('redemption_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'redemption_requests' },
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
