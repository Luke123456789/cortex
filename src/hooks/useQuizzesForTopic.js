import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './useAuth.jsx'

export function useQuizzesForTopic(topicId) {
  const { user } = useAuth()
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchQuizzes = useCallback(async () => {
    if (!topicId || !user) return
    setLoading(true)

    const { data: quizRows, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title, display_order, question_count, cooldown_hours')
      .eq('topic_id', topicId)
      .order('display_order')

    if (quizError) {
      console.error('Failed to load quizzes', quizError)
      setLoading(false)
      return
    }

    const { data: sessionRows, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('quiz_id, completed_at, score, question_count')
      .eq('student_id', user.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })

    if (sessionError) {
      console.error('Failed to load quiz sessions', sessionError)
    }

    const lastCompletionByQuiz = {}
    for (const session of sessionRows || []) {
      if (!lastCompletionByQuiz[session.quiz_id]) {
        lastCompletionByQuiz[session.quiz_id] = session
      }
    }

    const now = Date.now()
    const withStatus = quizRows.map((quiz) => {
      const lastSession = lastCompletionByQuiz[quiz.id]
      if (!lastSession) {
        return { ...quiz, locked: false, lockedUntil: null, lastScore: null }
      }
      const completedAt = new Date(lastSession.completed_at).getTime()
      const unlockAt = completedAt + quiz.cooldown_hours * 60 * 60 * 1000
      const locked = now < unlockAt
      return {
        ...quiz,
        locked,
        lockedUntil: locked ? new Date(unlockAt) : null,
        lastScore: lastSession.score,
        lastQuestionCount: lastSession.question_count,
      }
    })

    setQuizzes(withStatus)
    setLoading(false)
  }, [topicId, user])

  useEffect(() => {
    fetchQuizzes()
  }, [fetchQuizzes])

  return { quizzes, loading, refresh: fetchQuizzes }
}
