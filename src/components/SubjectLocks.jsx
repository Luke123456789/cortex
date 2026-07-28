import { useState } from 'react'
import { useSubjectLocks } from '../hooks/useSubjectLocks'

const DURATION_OPTIONS = [
  { label: '6 hours', hours: 6 },
  { label: '1 day', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
  { label: '2 weeks', hours: 336 },
]

function formatLockedUntil(date) {
  return date.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function SubjectRow({ subject, onLock, onUnlock }) {
  const [hours, setHours] = useState(24)
  const [busy, setBusy] = useState(false)

  async function handleLock() {
    setBusy(true)
    try {
      await onLock(subject.id, hours)
    } finally {
      setBusy(false)
    }
  }

  async function handleUnlock() {
    setBusy(true)
    try {
      await onUnlock(subject.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius)',
        padding: '12px 14px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: subject.locked ? '8px' : 0 }}>
        <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{subject.name}</span>
        {subject.locked && (
          <span className="mono" style={{ fontSize: '9.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--red)' }}>
            Locked
          </span>
        )}
      </div>

      {subject.locked ? (
        <>
          <div style={{ fontSize: '11.5px', color: 'var(--ink-faint)', marginBottom: '10px' }}>
            Unlocks {formatLockedUntil(subject.lockedUntil)}
          </div>
          <button
            onClick={handleUnlock}
            disabled={busy}
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px solid var(--rule-strong)',
              borderRadius: '8px',
              padding: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--ink)',
            }}
          >
            Unlock now
          </button>
        </>
      ) : (
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            style={{
              flex: 1,
              background: 'var(--paper)',
              border: '1px solid var(--rule)',
              borderRadius: '8px',
              padding: '8px 10px',
              fontSize: '12.5px',
              fontFamily: "'Space Grotesk', sans-serif",
              color: 'var(--ink)',
            }}
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.hours} value={opt.hours}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={handleLock}
            disabled={busy}
            style={{
              background: 'var(--ink)',
              color: 'var(--paper)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Lock
          </button>
        </div>
      )}
    </div>
  )
}

export default function SubjectLocks() {
  const { subjects, loading, lockSubject, unlockSubject } = useSubjectLocks()

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
        Lock a subject to stop quiz grinding and push practice toward other areas.
      </div>
      <div style={{ display: 'grid', gap: '8px' }}>
        {subjects.map((subject) => (
          <SubjectRow key={subject.id} subject={subject} onLock={lockSubject} onUnlock={unlockSubject} />
        ))}
      </div>
    </div>
  )
}
