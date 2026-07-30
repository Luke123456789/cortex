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

    // Subtopics only exist for some subjects (historically Economics only).
    // Questions in subjects without subtopics (e.g. Chemistry, PE, Biology,
    // English Lit) have a null subtopic_id — fall back to grouping those by
    // topic/subject instead of silently dropping them.
    const { data: topicRows, error: topicError } = await supabase
      .from('topics')
      .select('id, name, subjects (name)')

    if (topicError) {
      console.error('Failed to load topics', topicError)
      setLoading(false)
      return
    }

    const subtopicMap = {}
    for (const st of subtopicRows) {
      subtopicMap[st.id] = { name: st.name, specRef: st.spec_ref, topicName: st.topics?.name }
    }

    const topicMap = {}
    for (const t of topicRows) {
      topicMap[t.id] = { name: t.name, subjectName: t.subjects?.name }
    }

    const stats = {}
    for (const row of historyRows) {
      const subtopicId = row.questions?.subtopic_id
      const topicId = row.questions?.topic_id
      const key = subtopicId ? `subtopic:${subtopicId}` : topicId ? `topic:${topicId}` : null
      if (!key) continue
      if (!stats[key]) {
        stats[key] = { attempts: 0, correct: 0, subtopicId, topicId }
      }
      stats[key].attempts += 1
      if (row.answered_correctly) stats[key].correct += 1
    }

    const result = Object.entries(stats)
      .map(([key, s]) => {
        const usingSubtopic = !!s.subtopicId
        return {
          key,
          name: usingSubtopic
            ? subtopicMap[s.subtopicId]?.name || 'Unknown subtopic'
            : topicMap[s.topicId]?.name || 'Unknown topic',
          specRef: usingSubtopic ? subtopicMap[s.subtopicId]?.specRef : null,
          topicName: usingSubtopic ? subtopicMap[s.subtopicId]?.topicName : topicMap[s.topicId]?.subjectName,
          attempts: s.attempts,
          correct: s.correct,
          accuracy: Math.round((s.correct / s.attempts) * 100),
        }
      })
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
