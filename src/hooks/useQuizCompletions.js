import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useQuizCompletions() {
  const [completions, setCompletions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCompletions = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('id, score, question_count, completed_at, quizzes (title), topics (name, subjects (name))')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Failed to load quiz completions', error)
      setLoading(false)
      return
    }

    setCompletions(
      data.map((row) => ({
        id: row.id,
        score: row.score,
        questionCount: row.question_count,
        completedAt: row.completed_at,
        quizTitle: row.quizzes?.title || 'Unknown quiz',
        topicName: row.topics?.name || 'Unknown topic',
        subjectName: row.topics?.subjects?.name || 'Unknown subject',
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCompletions()

    const channel = supabase
      .channel('quiz_completions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_sessions' },
        () => fetchCompletions()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchCompletions])

  return { completions, loading, refresh: fetchCompletions }
}
