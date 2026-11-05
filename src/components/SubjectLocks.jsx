import { useState, useEffect } from 'react'
import { useSubjectLocks } from '../hooks/useSubjectLocks'
import styles from './SubjectLocks.module.css'

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

export default function SubjectLocks({ studentId }) {
  const { subjects, locks, loading, lock, unlock } = useSubjectLocks(studentId)
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
    return <p className="empty">Loading subjects…</p>
  }

  if (subjects.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="locks-title">
      <h2 id="locks-title" className="section-label">Subject lockouts</h2>
      <p className={styles.intro}>
        Lock a subject or a single topic to stop quiz grinding and push practice toward other areas.
      </p>

      <div className={styles.form}>
        <div>
          <label className="field-label" htmlFor="lock-subject">Subject</label>
          <select id="lock-subject" className="field" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="lock-topic">Topic</label>
          <select id="lock-topic" className="field" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            <option value="">Entire subject</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className={styles.durationField}>
          <label className="field-label" htmlFor="lock-duration">For</label>
          <div className={styles.duration}>
            <select id="lock-duration" className="field" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.hours} value={opt.hours}>{opt.label}</option>
              ))}
            </select>
            <button type="button" className="btn btn--primary" onClick={handleLock} disabled={busy || !subjectId}>
              Lock
            </button>
          </div>
        </div>
      </div>

      {locks.length === 0 ? (
        <p className="empty">Nothing locked right now.</p>
      ) : (
        <ul className={styles.locks}>
          {locks.map((l) => (
            <li key={l.id} className={`card ${styles.lock}`}>
              <div>
                <div className={styles.lockLabel}>{l.label}</div>
                <div className="meta">Unlocks {formatLockedUntil(l.lockedUntil)}</div>
              </div>
              <button type="button" className="btn btn--secondary btn--small" onClick={() => handleUnlock(l.id)} disabled={busy}>
                Unlock
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
