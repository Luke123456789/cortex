import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useLedger() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async () => {
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Failed to load ledger entries', error)
    } else {
      setEntries(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEntries()

    const channel = supabase
      .channel('ledger_entries_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ledger_entries' },
        () => fetchEntries()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchEntries])

  const balance = entries.reduce((total, entry) => {
    return entry.type === 'earn' ? total + entry.amount_minutes : total - entry.amount_minutes
  }, 0)

  return { entries, balance, loading, refresh: fetchEntries }
}
