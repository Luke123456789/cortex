import { useState } from 'react'
import { useQuizCompletions } from '../hooks/useQuizCompletions'

function formatDate(isoString) {
  return new Date(isoString).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function scoreColor(score, questionCount) {
  if (!questionCount) return 'var(--ink-faint)'
  const pct = score / questionCount
  if (pct < 0.5) return 'var(--red)'
  if (pct < 0.75) return 'var(--brass)'
  return 'var(--green)'
}

export default function QuizCompletions() {
  const { completions, loading } = useQuizCompletions()
  const [showAll, setShowAll] = useState(false)

  if (loading) {
    return <div style={{ fontSize: '12px', color: 'var(--ink-faint)', marginBottom: '18px' }}>Loading quiz completions…</div>
  }

  if (completions.length === 0) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <div className="section-label">Quiz completions</div>
        <div style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>No quizzes completed yet.</div>
      </div>
    )
  }

  const visible = showAll ? completions : completions.slice(0, 6)

  return (
    <div style={{ marginBottom: '20px' }}>
      <div className="section-label">Quiz completions · {completions.length}</div>
      <div style={{ display: 'grid', gap: '8px' }}>
        {visible.map((c) => (
          <div
            key={c.id}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius)',
              padding: '10px 13px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
              <span style={{ fontSize: '13px' }}>{c.subjectName} · {c.topicName}</span>
              <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color: scoreColor(c.score, c.questionCount) }}>
                {c.score}/{c.questionCount}
              </span>
            </div>
            <div className="mono" style={{ fontSize: '9.5px', color: 'var(--ink-faint)' }}>
              {c.quizTitle} · {formatDate(c.completedAt)}
            </div>
          </div>
        ))}
      </div>
      {!showAll && completions.length > 6 && (
        <button
          onClick={() => setShowAll(true)}
          style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--brass)', textDecoration: 'underline', padding: 0, marginTop: '8px' }}
        >
          View more ({completions.length - 6} more)
        </button>
      )}
    </div>
  )
}
