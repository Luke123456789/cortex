import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuizCatalog } from '../hooks/useQuizCatalog'
import { useQuizzesForTopic } from '../hooks/useQuizzesForTopic'

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

function formatUnlockTime(date) {
  const now = Date.now()
  const diffMs = date.getTime() - now
  const diffHours = diffMs / (1000 * 60 * 60)
  if (diffHours < 1) {
    const mins = Math.ceil(diffMs / (1000 * 60))
    return `unlocks in ${mins}m`
  }
  if (diffHours < 24) {
    return `unlocks in ${Math.ceil(diffHours)}h`
  }
  return `unlocks ${date.toLocaleDateString([], { day: '2-digit', month: 'short' })}`
}

export default function QuizPicker() {
  const { subjects, loading: catalogLoading } = useQuizCatalog()
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

  const { quizzes, loading: quizzesLoading } = useQuizzesForTopic(topicId)

  if (catalogLoading) {
    return <div style={{ fontSize: '12px', color: 'var(--ink-faint)', marginBottom: '18px' }}>Loading quiz topics…</div>
  }

  if (subjects.length === 0) {
    return null
  }

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
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>

      {quizzesLoading ? (
        <div style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>Loading quizzes…</div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {quizzes.map((quiz) => (
            <button
              key={quiz.id}
              disabled={quiz.locked}
              onClick={() => navigate(`/play/${quiz.id}`)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                background: quiz.locked ? 'var(--paper-2)' : 'var(--ink)',
                color: quiz.locked ? 'var(--ink-faint)' : 'var(--paper)',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 600,
                opacity: quiz.locked ? 0.7 : 1,
                cursor: quiz.locked ? 'not-allowed' : 'pointer',
              }}
            >
              <span>{quiz.title} · {quiz.question_count} questions</span>
              <span className="mono" style={{ fontSize: '10px', fontWeight: 400 }}>
                {quiz.locked
                  ? formatUnlockTime(quiz.lockedUntil)
                  : quiz.lastScore != null
                    ? `last: ${quiz.lastScore}/${quiz.lastQuestionCount}`
                    : 'not attempted'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
