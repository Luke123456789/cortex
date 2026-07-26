import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useLedger() {
  const [entries, setEntries] = useState([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async () => {
    // This powers the "recent activity" list only — it's deliberately capped
    // at 50 rows and must never be used to derive the balance (that caused a
    // real bug: once total entries passed 50, older 'earn' rows fell outside
    // this window and got silently excluded from the balance sum).
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

  const fetchBalance = useCallback(async () => {
    // Full-history aggregate computed in the database, independent of how
    // many rows we display above — this is the only source of truth for
    // the balance shown to James.
    const { data, error } = await supabase.rpc('get_screen_time_balance')

    if (error) {
      console.error('Failed to load ledger balance', error)
    } else {
      setBalance(data ?? 0)
    }
  }, [])

  const refresh = useCallback(async () => {
    await Promise.all([fetchEntries(), fetchBalance()])
  }, [fetchEntries, fetchBalance])

  useEffect(() => {
    refresh()

    const channel = supabase
      .channel('ledger_entries_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ledger_entries' },
        () => refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

  return { entries, balance, loading, refresh }
}
