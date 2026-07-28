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
      .select('subject_id, topic_id, locked_until')

    if (lockError) {
      console.error('Failed to load subject locks', lockError)
      setError(lockError)
      setLoading(false)
      return
    }

    const now = Date.now()
    const lockBySubject = {}
    const lockByTopic = {}
    for (const lockRow of lockRows) {
      if (new Date(lockRow.locked_until).getTime() <= now) continue
      if (lockRow.topic_id) {
        lockByTopic[lockRow.topic_id] = lockRow
      } else {
        lockBySubject[lockRow.subject_id] = lockRow
      }
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
        const subjectLock = lockBySubject[subject.id]
        const subjectLocked = !!subjectLock
        const subjectLockedUntil = subjectLocked ? new Date(subjectLock.locked_until) : null

        const topics = topicsWithCounts
          .filter((t) => t.subject_id === subject.id)
          .map((topic) => {
            const topicLock = lockByTopic[topic.id]
            const locked = subjectLocked || !!topicLock
            const lockedUntil = subjectLocked
              ? subjectLockedUntil
              : topicLock
                ? new Date(topicLock.locked_until)
                : null
            return { ...topic, locked, lockedUntil }
          })

        return {
          ...subject,
          topics,
          locked: subjectLocked,
          lockedUntil: subjectLockedUntil,
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
