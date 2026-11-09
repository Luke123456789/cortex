import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useAssessments } from '../../hooks/useAssessments'
import styles from './ProgressReview.module.css'

const WINDOW_OPTIONS = [
  { value: '24h', label: 'Past 24 hours' },
  { value: '7d', label: 'Past week' },
  { value: '30d', label: 'Past month' },
  { value: 'all', label: 'All time' },
]

function formatTime(isoString) {
  return new Date(isoString).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function ResultCard({ result }) {
  const groups = [
    { key: 'strengths', title: 'Strengths', items: result.strengths, className: styles.strengths },
    { key: 'improve', title: 'Areas to improve', items: result.areasToImprove, className: styles.improve },
    { key: 'next', title: 'Recommended next steps', items: result.recommendedActions, className: styles.next },
  ].filter((g) => g.items.length > 0)

  return (
    <article className={`card card--strong ${styles.result}`}>
      <h4 className={styles.resultHeadline}>{result.headline}</h4>
      <p className={styles.narrative}>{result.narrative}</p>
      {groups.length > 0 && (
        <div className={styles.groups}>
          {groups.map((g) => (
            <div key={g.key}>
              <h5 className={`${styles.groupTitle} ${g.className}`}>{g.title}</h5>
              <ul className={styles.points}>
                {g.items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

// The on-demand AI progress review (formerly the Assessment page), now a
// section of Analytics. Behaviour unchanged.
export default function ProgressReview() {
  const { childStudent } = useAuth()
  const displayName = childStudent?.displayName
  const { assessments, loading: historyLoading, refresh } = useAssessments(childStudent?.id)
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [windowKey, setWindowKey] = useState('7d')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [latestResult, setLatestResult] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    supabase
      .from('subjects')
      .select('id, name')
      .order('name')
      .then(({ data, error: subjectsError }) => {
        if (subjectsError) console.error('Failed to load subjects', subjectsError)
        setSubjects(data || [])
      })
  }, [])

  const studentLabel = displayName || 'student'

  async function handleAssess() {
    setRunning(true)
    setError(null)
    setLatestResult(null)
    // A little slack for a phone clock that runs ahead of the server.
    const startedAt = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assess-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ studentId: childStudent?.id, subjectId: subjectId || null, window: windowKey }),
      })
      if (!res.ok) throw new Error('Assessment request failed')
      const data = await res.json()
      if (data.status === 'error' || !data.result) throw new Error('Assessment came back incomplete')
      setLatestResult(data.result)
      refresh()
    } catch (err) {
      console.error(err)
      // The review can take ~30s; on a phone the response is sometimes lost
      // even though the server finished and saved it. Show that one if so.
      const { data: saved } = await supabase
        .from('assessments')
        .select('result')
        .eq('student_id', childStudent?.id)
        .eq('status', 'complete')
        .gte('requested_at', startedAt)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (saved?.result) {
        setLatestResult(saved.result)
        refresh()
      } else {
        setError('Could not run the assessment right now. Try again in a moment.')
      }
    } finally {
      setRunning(false)
    }
  }

  return (
    <section aria-labelledby="review-title">
      <h2 id="review-title" className="section-label">AI progress review</h2>
      <p className={styles.intro}>
        Pulls recent tutor sessions, quizzes and written tests and asks the model for an honest read on progress. Runs only when you ask — nothing here happens automatically.
      </p>

      <div className={styles.controls}>
        <div>
          <label className="field-label" htmlFor="assess-subject">Subject</label>
          <select id="assess-subject" className="field" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="assess-window">Period</label>
          <select id="assess-window" className="field" value={windowKey} onChange={(e) => setWindowKey(e.target.value)}>
            {WINDOW_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn--primary" onClick={handleAssess} disabled={running}>
          {running ? 'Assessing…' : `Assess ${studentLabel}`}
        </button>
      </div>

      {error && <p className={`error-text ${styles.error}`} role="alert">{error}</p>}

      {latestResult && <ResultCard result={latestResult} />}

      <section className={styles.history} aria-labelledby="assess-history">
        <h3 id="assess-history" className="section-label">Past reviews</h3>
        {historyLoading ? (
          <p className="empty">Loading…</p>
        ) : assessments.length === 0 ? (
          <p className="empty">No assessments run yet.</p>
        ) : (
          <ul className={styles.list}>
            {assessments.map((a) => {
              const isExpanded = expandedId === a.id
              return (
                <li key={a.id} className={styles.item}>
                  <button
                    type="button"
                    className={styles.row}
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  >
                    <span className={styles.chevron} aria-hidden="true">{a.result ? '›' : ''}</span>
                    <span>
                      <span className={styles.headline}>
                        {a.status === 'error' ? 'Assessment failed' : (a.result?.headline || 'Assessment')}
                      </span>
                      <span className="meta">
                        {a.subjects?.name || 'All subjects'} · {WINDOW_OPTIONS.find((w) => w.value === a.time_window)?.label || a.time_window} · {formatTime(a.requested_at)}
                      </span>
                    </span>
                  </button>
                  {isExpanded && a.result && (
                    <div className={styles.expanded}><ResultCard result={a.result} /></div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </section>
  )
}
