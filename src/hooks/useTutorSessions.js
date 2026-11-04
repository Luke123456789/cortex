import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

// studentId: whose rows to show (see useAuth). Nothing loads until it's known.
export function useTutorSessions(studentId) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSessions = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('tutor_sessions')
      .select('id, started_at, completed_at, message_count, minutes_earned, reward_claimed, messages, subtopics (name, topics (name, subjects (name)))')
      .eq('student_id', studentId)
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
        messages: Array.isArray(row.messages) ? row.messages : [],
        subtopicName: row.subtopics?.name,
        topicName: row.subtopics?.topics?.name,
        subjectName: row.subtopics?.topics?.subjects?.name,
      }))
    )
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    if (!studentId) return
    fetchSessions()

    const channel = supabase
      .channel(`tutor_sessions_changes_${studentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tutor_sessions', filter: `student_id=eq.${studentId}` },
        () => fetchSessions()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchSessions])

  return { sessions, loading, refresh: fetchSessions }
}
