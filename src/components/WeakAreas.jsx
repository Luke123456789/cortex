import { useState } from 'react'
import { useWeakAreas } from '../hooks/useWeakAreas'

function accuracyColor(accuracy) {
  if (accuracy < 50) return 'var(--red)'
  if (accuracy < 75) return 'var(--brass)'
  return 'var(--green)'
}

export default function WeakAreas() {
  const { areas, loading, totalAttempts } = useWeakAreas()
  const [showAll, setShowAll] = useState(false)

  if (loading) {
    return <div style={{ fontSize: '12px', color: 'var(--ink-faint)', marginBottom: '18px' }}>Loading performance data…</div>
  }

  if (totalAttempts === 0) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <div className="section-label">Weak areas</div>
        <div style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>No quizzes completed yet.</div>
      </div>
    )
  }

  const visibleAreas = showAll ? areas : areas.slice(0, 6)

  return (
    <div style={{ marginBottom: '20px' }}>
      <div className="section-label">Weak areas · {totalAttempts} question(s) answered</div>
      <div style={{ display: 'grid', gap: '8px' }}>
        {visibleAreas.map((area) => (
          <div
            key={area.key}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius)',
              padding: '10px 13px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
              <span style={{ fontSize: '13px' }}>{area.name}</span>
              <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color: accuracyColor(area.accuracy) }}>
                {area.accuracy}%
              </span>
            </div>
            <div className="mono" style={{ fontSize: '9.5px', color: 'var(--ink-faint)' }}>
              {area.topicName} · {area.correct}/{area.attempts} correct
            </div>
          </div>
        ))}
      </div>
      {!showAll && areas.length > 6 && (
        <button
          onClick={() => setShowAll(true)}
          style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--brass)', textDecoration: 'underline', padding: 0, marginTop: '8px' }}
        >
          View more ({areas.length - 6} more)
        </button>
      )}
    </div>
  )
}
