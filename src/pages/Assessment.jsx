import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useStudentProfile } from '../hooks/useStudentProfile'
import { useAssessments } from '../hooks/useAssessments'

const WINDOW_OPTIONS = [
  { value: '24h', label: 'Past 24 hours' },
  { value: '7d', label: 'Past week' },
  { value: '30d', label: 'Past month' },
  { value: 'all', label: 'All time' },
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

function formatTime(isoString) {
  return new Date(isoString).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function ResultCard({ result }) {
  return (
    <div style={{ background: 'var(--card)', border: '1.5px solid var(--rule-strong)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '16px' }}>
      <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px' }}>{result.headline}</div>
      <div style={{ fontSize: '13px', lineHeight: 1.5, marginBottom: '12px' }}>{result.narrative}</div>

      {result.strengths.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div className="mono" style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--green)', marginBottom: '4px' }}>Strengths</div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', lineHeight: 1.5 }}>
            {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {result.areasToImprove.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div className="mono" style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--brass)', marginBottom: '4px' }}>Areas to improve</div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', lineHeight: 1.5 }}>
            {result.areasToImprove.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {result.recommendedActions.length > 0 && (
        <div>
          <div className="mono" style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--ink-faint)', marginBottom: '4px' }}>Recommended next steps</div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', lineHeight: 1.5 }}>
            {result.recommendedActions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function Assessment() {
  const { displayName } = useStudentProfile()
  const { assessments, loading: historyLoading, refresh } = useAssessments()
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
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assess-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ subjectId: subjectId || null, window: windowKey }),
      })
      if (!res.ok) throw new Error('Assessment request failed')
      const data = await res.json()
      if (data.status === 'error' || !data.result) throw new Error('Assessment came back incomplete')
      setLatestResult(data.result)
      refresh()
    } catch (err) {
      console.error(err)
      setError('Could not run the assessment right now. Try again in a moment.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="device">
      <div className="screen">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div className="wordmark">CORTEX</div>
          <Link to="/parent" style={{ fontSize: '11px', color: 'var(--ink-faint)', textDecoration: 'underline' }}>
            Back
          </Link>
        </div>

        <div className="section-label">Assess {studentLabel}</div>
        <div style={{ fontSize: '11.5px', color: 'var(--ink-faint)', marginBottom: '14px' }}>
          Pulls recent tutor sessions, quizzes and written tests and asks the model for an honest read on progress. Runs only when you ask — nothing here happens automatically.
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <select style={selectStyle} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select style={selectStyle} value={windowKey} onChange={(e) => setWindowKey(e.target.value)}>
            {WINDOW_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleAssess}
          disabled={running}
          style={{
            width: '100%',
            background: 'var(--ink)',
            color: 'var(--paper)',
            border: 'none',
            borderRadius: '8px',
            padding: '11px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '18px',
            opacity: running ? 0.6 : 1,
          }}
        >
          {running ? 'Assessing…' : `Assess ${studentLabel}`}
        </button>

        {error && (
          <div style={{ fontSize: '12.5px', color: 'var(--red)', marginBottom: '16px' }}>{error}</div>
        )}

        {latestResult && <ResultCard result={latestResult} />}

        <div className="section-label" style={{ marginTop: '10px' }}>Past assessments</div>
        {historyLoading ? (
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>Loading…</div>
        ) : assessments.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>No assessments run yet.</div>
        ) : (
          assessments.map((a) => {
            const isExpanded = expandedId === a.id
            return (
              <div key={a.id} style={{ borderBottom: '1px solid var(--rule)' }}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', cursor: 'pointer' }}
                >
                  <div>
                    <div style={{ fontSize: '13.5px' }}>
                      {a.status === 'error' ? 'Assessment failed' : (a.result?.headline || 'Assessment')}
                    </div>
                    <span className="mono" style={{ fontSize: '9.5px', color: 'var(--ink-faint)' }}>
                      {a.subjects?.name || 'All subjects'} · {WINDOW_OPTIONS.find((w) => w.value === a.time_window)?.label || a.time_window} · {formatTime(a.requested_at)}
                    </span>
                  </div>
                </div>
                {isExpanded && a.result && <ResultCard result={a.result} />}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
