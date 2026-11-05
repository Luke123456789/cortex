import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Subject and topic names by id, so an assignment called "Quiz 1" can say
// which subject and topic it's from.
export function useCatalogNames() {
  const [names, setNames] = useState({ subjects: new Map(), topics: new Map() })
  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('subjects').select('id, name'),
      supabase.from('topics').select('id, name'),
    ]).then(([s, t]) => {
      if (cancelled) return
      if (s.error) console.error('Failed to load subject names', s.error)
      if (t.error) console.error('Failed to load topic names', t.error)
      setNames({
        subjects: new Map((s.data || []).map((x) => [x.id, x.name])),
        topics: new Map((t.data || []).map((x) => [x.id, x.name])),
      })
    })
    return () => { cancelled = true }
  }, [])
  return names
}
