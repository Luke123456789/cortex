import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// This is a single-family app (one parent, one student) — there's no
// parent-child link table, so "the student" is just the one profile row
// with role='student'.
export function useStudentProfile() {
  const [displayName, setDisplayName] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('display_name')
      .eq('role', 'student')
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Failed to load student profile', error)
        setDisplayName(data?.display_name ?? null)
        setLoading(false)
      })
  }, [])

  return { displayName, loading }
}
