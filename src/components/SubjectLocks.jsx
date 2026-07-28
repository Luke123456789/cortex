import { useState, useEffect } from 'react'
import { useSubjectLocks } from '../hooks/useSubjectLocks'

const DURATION_OPTIONS = [
  { label: '6 hours', hours: 6 },
  { label: '1 day', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
  { label: '2 weeks', hours: 336 },
]

const selectStyle = {
  flex: 1,
  background: 'var(--paper)',
  border: '1px solid var(--rule)',
  borderRadius: '8px',
  padding: '9px 10px',
  fontSize: '12.5px',
  fontFamily: "'Space Grotesk', sans-serif",
  color: 'var(--ink)',
}

function formatLockedUntil(date) {
  return date.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function SubjectLocks() {
  const { subjects, locks, loading, lock, unlock } = useSubjectLocks()
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [hours, setHours] = useState(24)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (subjects.length && !subjectId) setSubjectId(subjects[0].id)
  }, [subjects, subjectId])

  const selectedSubject = subjects.find((s) => s.id === subjectId)
  const topics = selectedSubject?.topics || []

  useEffect(() => {
    setTopicId('')
  }, [subjectId])

  async function handleLock() {
    setBusy(true)
    try {
      await lock(subjectId, topicId || null, hours)
    } finally {
      setBusy(false)
    }
  }

  async function handleUnlock(lockId) {
    setBusy(true)
    try {
      await unlock(lockId)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div style={{ fontSize: '12px', color: 'var(--ink-faint)', marginBottom: '18px' }}>Loading subjects…</div>
  }

  if (subjects.length === 0) {
    return null
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div className="section-label">Subject lockouts</div>
      <div style={{ fontSize: '11.5px', color: 'var(--ink-faint)', marginBottom: '10px' }}>
        Lock a subject or a single topic to stop quiz grinding and push practice toward other areas.
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <select style={selectStyle} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select style={selectStyle} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
          <option value="">Entire subject</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <select style={selectStyle} value={hours} onChange={(e) => setHours(Number(e.target.value))}>
          {DURATION_OPTIONS.map((opt) => (
            <option key={opt.hours} value={opt.hours}>{opt.label}</option>
          ))}
        </select>
        <button
          onClick={handleLock}
          disabled={busy || !subjectId}
          style={{
            background: 'var(--ink)',
            color: 'var(--paper)',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 18px',
            fontSize: '12.5px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Lock
        </button>
      </div>

      {locks.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>Nothing locked right now.</div>
      ) : (
        <div style={{ display: 'grid', gap: '6px' }}>
          {locks.map((l) => (
            <div
              key={l.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--card)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius)',
                padding: '9px 12px',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{l.label}</div>
                <div className="mono" style={{ fontSize: '9.5px', color: 'var(--ink-faint)' }}>
                  Unlocks {formatLockedUntil(l.lockedUntil)}
                </div>
              </div>
              <button
                onClick={() => handleUnlock(l.id)}
                disabled={busy}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--rule-strong)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: 'var(--ink)',
                }}
              >
                Unlock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
