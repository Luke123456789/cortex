import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useQuizCatalog() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCatalog = useCallback(async () => {
    setLoading(true)
    const { data: subjectRows, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name')
      .order('name')

    if (subjectError) {
      console.error('Failed to load subjects', subjectError)
      setError(subjectError)
      setLoading(false)
      return
    }

    const { data: lockRows, error: lockError } = await supabase
      .from('subject_locks')
      .select('subject_id, locked_until')

    if (lockError) {
      console.error('Failed to load subject locks', lockError)
      setError(lockError)
      setLoading(false)
      return
    }

    const now = Date.now()
    const lockBySubject = {}
    for (const lock of lockRows) {
      lockBySubject[lock.subject_id] = lock
    }

    const { data: topicRows, error: topicError } = await supabase
      .from('topics')
      .select('id, subject_id, name, display_order')
      .order('display_order')

    if (topicError) {
      console.error('Failed to load topics', topicError)
      setError(topicError)
      setLoading(false)
      return
    }

    const { data: questionCounts, error: countError } = await supabase
      .from('questions')
      .select('topic_id')
      .eq('active', true)

    if (countError) {
      console.error('Failed to load question counts', countError)
      setError(countError)
      setLoading(false)
      return
    }

    const countsByTopic = {}
    for (const row of questionCounts) {
      countsByTopic[row.topic_id] = (countsByTopic[row.topic_id] || 0) + 1
    }

    const topicsWithCounts = topicRows.map((topic) => ({
      ...topic,
      questionCount: countsByTopic[topic.id] || 0,
    }))

    const grouped = subjectRows
      .map((subject) => {
        const lock = lockBySubject[subject.id]
        const locked = !!lock && new Date(lock.locked_until).getTime() > now
        return {
          ...subject,
          topics: topicsWithCounts.filter((t) => t.subject_id === subject.id),
          locked,
          lockedUntil: locked ? new Date(lock.locked_until) : null,
        }
      })
      .filter((subject) => subject.topics.some((t) => t.questionCount > 0))

    setSubjects(grouped)
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCatalog()

    const channel = supabase
      .channel('subject_locks_catalog_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subject_locks' },
        () => fetchCatalog()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchCatalog])

  return { subjects, loading, error, refresh: fetchCatalog }
}
