import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './useAuth.jsx'

export function useSubjectLocks() {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState([])
  const [locks, setLocks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
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

    const { data: topicRows, error: topicError } = await supabase
      .from('topics')
      .select('id, subject_id, name')
      .order('display_order')

    if (topicError) {
      console.error('Failed to load topics', topicError)
      setLoading(false)
      return
    }

    const { data: lockRows, error: lockError } = await supabase
      .from('subject_locks')
      .select('id, subject_id, topic_id, locked_until')

    if (lockError) {
      console.error('Failed to load subject locks', lockError)
      setLoading(false)
      return
    }

    const subjectsById = {}
    for (const s of subjectRows) subjectsById[s.id] = s
    const topicsById = {}
    for (const t of topicRows) topicsById[t.id] = t

    const now = Date.now()
    const activeLocks = lockRows
      .filter((lock) => new Date(lock.locked_until).getTime() > now)
      .map((lock) => {
        const subjectName = subjectsById[lock.subject_id]?.name || 'Unknown subject'
        const topicName = lock.topic_id ? topicsById[lock.topic_id]?.name : null
        return {
          ...lock,
          lockedUntil: new Date(lock.locked_until),
          label: topicName ? `${subjectName} · ${topicName}` : subjectName,
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))

    const subjectsWithTopics = subjectRows.map((s) => ({
      ...s,
      topics: topicRows.filter((t) => t.subject_id === s.id),
    }))

    setSubjects(subjectsWithTopics)
    setLocks(activeLocks)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()

    const channel = supabase
      .channel('subject_locks_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subject_locks' },
        () => fetchAll()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAll])

  async function lock(subjectId, topicId, hours) {
    const lockedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

    let clearExisting = supabase.from('subject_locks').delete().eq('subject_id', subjectId)
    clearExisting = topicId ? clearExisting.eq('topic_id', topicId) : clearExisting.is('topic_id', null)
    const { error: deleteError } = await clearExisting
    if (deleteError) {
      console.error('Failed to clear existing lock', deleteError)
      throw deleteError
    }

    const { error } = await supabase.from('subject_locks').insert({
      subject_id: subjectId,
      topic_id: topicId || null,
      locked_until: lockedUntil,
      created_by: user?.id,
    })
    if (error) {
      console.error('Failed to lock', error)
      throw error
    }
    await fetchAll()
  }

  async function unlock(lockId) {
    const { error } = await supabase.from('subject_locks').delete().eq('id', lockId)
    if (error) {
      console.error('Failed to unlock', error)
      throw error
    }
    await fetchAll()
  }

  return { subjects, locks, loading, lock, unlock, refresh: fetchAll }
}
