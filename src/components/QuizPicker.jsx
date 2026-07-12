import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuizCatalog } from '../hooks/useQuizCatalog'

const selectStyle = {
  width: '100%',
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '13px',
  fontFamily: "'Space Grotesk', sans-serif",
  color: 'var(--ink)',
  marginBottom: '10px',
}

export default function QuizPicker() {
  const { subjects, loading } = useQuizCatalog()
  const navigate = useNavigate()
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')

  useEffect(() => {
    if (subjects.length && !subjectId) {
      setSubjectId(subjects[0].id)
    }
  }, [subjects, subjectId])

  const selectedSubject = subjects.find((s) => s.id === subjectId)
  const topics = selectedSubject?.topics.filter((t) => t.questionCount > 0) || []

  useEffect(() => {
    if (topics.length && !topics.some((t) => t.id === topicId)) {
      setTopicId(topics[0].id)
    }
  }, [topics, topicId])

  if (loading) {
    return <div style={{ fontSize: '12px', color: 'var(--ink-faint)', marginBottom: '18px' }}>Loading quiz topics…</div>
  }

  if (subjects.length === 0) {
    return null
  }

  const selectedTopic = topics.find((t) => t.id === topicId)

  return (
    <div style={{ marginBottom: '20px' }}>
      <div className="section-label">Start a quiz</div>

      <select style={selectStyle} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <select style={selectStyle} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
        {topics.map((t) => (
          <option key={t.id} value={t.id}>{t.name} ({t.questionCount} questions)</option>
        ))}
      </select>

      <button
        onClick={() => selectedTopic && navigate(`/quiz/${selectedTopic.id}`)}
        disabled={!selectedTopic}
        style={{
          width: '100%',
          background: 'var(--ink)',
          color: 'var(--paper)',
          border: 'none',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '13px',
          fontWeight: 600,
        }}
      >
        Start quiz
      </button>
    </div>
  )
}
