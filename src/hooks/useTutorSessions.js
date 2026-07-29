import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useTutorSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSessions = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('tutor_sessions')
      .select('id, started_at, completed_at, message_count, minutes_earned, reward_claimed, subtopics (name, topics (name, subjects (name)))')
      .order('started_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Failed to load tutor sessions', error)
      setLoading(false)
      return
    }

    setSessions(
      (data || []).map((row) => ({
        id: row.id,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        messageCount: row.message_count,
        minutesEarned: row.minutes_earned,
        rewardClaimed: row.reward_claimed,
        subtopicName: row.subtopics?.name,
        topicName: row.subtopics?.topics?.name,
        subjectName: row.subtopics?.topics?.subjects?.name,
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSessions()

    const channel = supabase
      .channel('tutor_sessions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tutor_sessions' },
        () => fetchSessions()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchSessions])

  return { sessions, loading, refresh: fetchSessions }
}
