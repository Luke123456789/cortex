import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './useAuth.jsx'

export function useSubjectLocks() {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSubjects = useCallback(async () => {
    setLoading(true)

    const { data: subjectRows, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name')
      .order('name')

    if (subjectError) {
      console.error('Failed to load subjects', subjectError)
      setLoading(false)
      return
    }

    const { data: lockRows, error: lockError } = await supabase
      .from('subject_locks')
      .select('subject_id, locked_until, reason')

    if (lockError) {
      console.error('Failed to load subject locks', lockError)
      setLoading(false)
      return
    }

    const now = Date.now()
    const lockBySubject = {}
    for (const lock of lockRows) {
      lockBySubject[lock.subject_id] = lock
    }

    const withStatus = subjectRows.map((subject) => {
      const lock = lockBySubject[subject.id]
      const locked = !!lock && new Date(lock.locked_until).getTime() > now
      return {
        ...subject,
        locked,
        lockedUntil: locked ? new Date(lock.locked_until) : null,
        reason: locked ? lock.reason : null,
      }
    })

    setSubjects(withStatus)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSubjects()

    const channel = supabase
      .channel('subject_locks_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subject_locks' },
        () => fetchSubjects()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchSubjects])

  async function lockSubject(subjectId, hours, reason) {
    const lockedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    const { error } = await supabase
      .from('subject_locks')
      .upsert(
        { subject_id: subjectId, locked_until: lockedUntil, reason: reason || null, created_by: user?.id },
        { onConflict: 'subject_id' }
      )
    if (error) {
      console.error('Failed to lock subject', error)
      throw error
    }
    await fetchSubjects()
  }

  async function unlockSubject(subjectId) {
    const { error } = await supabase.from('subject_locks').delete().eq('subject_id', subjectId)
    if (error) {
      console.error('Failed to unlock subject', error)
      throw error
    }
    await fetchSubjects()
  }

  return { subjects, loading, lockSubject, unlockSubject, refresh: fetchSubjects }
}
