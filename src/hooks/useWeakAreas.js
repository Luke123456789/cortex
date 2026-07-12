import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useWeakAreas() {
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalAttempts, setTotalAttempts] = useState(0)

  const fetchAreas = useCallback(async () => {
    setLoading(true)

    const { data: historyRows, error: historyError } = await supabase
      .from('student_question_history')
      .select('answered_correctly, questions (subtopic_id, topic_id)')

    if (historyError) {
      console.error('Failed to load question history', historyError)
      setLoading(false)
      return
    }

    const { data: subtopicRows, error: subtopicError } = await supabase
      .from('subtopics')
      .select('id, name, spec_ref, topic_id, topics (name)')

    if (subtopicError) {
      console.error('Failed to load subtopics', subtopicError)
      setLoading(false)
      return
    }

    const subtopicMap = {}
    for (const st of subtopicRows) {
      subtopicMap[st.id] = { name: st.name, specRef: st.spec_ref, topicName: st.topics?.name }
    }

    const stats = {}
    for (const row of historyRows) {
      const subtopicId = row.questions?.subtopic_id
      if (!subtopicId) continue
      if (!stats[subtopicId]) {
        stats[subtopicId] = { attempts: 0, correct: 0 }
      }
      stats[subtopicId].attempts += 1
      if (row.answered_correctly) stats[subtopicId].correct += 1
    }

    const result = Object.entries(stats)
      .map(([subtopicId, s]) => ({
        subtopicId,
        name: subtopicMap[subtopicId]?.name || 'Unknown subtopic',
        specRef: subtopicMap[subtopicId]?.specRef,
        topicName: subtopicMap[subtopicId]?.topicName,
        attempts: s.attempts,
        correct: s.correct,
        accuracy: Math.round((s.correct / s.attempts) * 100),
      }))
      .sort((a, b) => a.accuracy - b.accuracy)

    setAreas(result)
    setTotalAttempts(historyRows.length)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  return { areas, loading, totalAttempts, refresh: fetchAreas }
}
