import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../hooks/useAuth.jsx'
import { ASSIGNMENT_TYPE_LABELS } from '../../lib/assignments'
import styles from './SuggestedAssignments.module.css'

const FOCUS = {
  avoided: { label: 'Avoided', className: styles.focusAvoided },
  struggling: { label: 'Struggling', className: styles.focusStruggling },
  consolidate: { label: 'Consolidate', className: '' },
}

function inDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// AI-suggested work for the parent's student. Nothing is assigned until the
// parent ticks items and presses "Assign selected"; the rows inserted are the
// same shape Assign work creates.
export default function SuggestedAssignments({ studentId, studentName }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [overview, setOverview] = useState('')
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [asked, setAsked] = useState(false)

  async function handleSuggest() {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ studentId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !Array.isArray(data.suggestions)) throw new Error(data.error || 'Suggestion request failed')
      setOverview(data.overview || '')
      setItems(data.suggestions.map((s, i) => ({ ...s, key: `${s.type}-${s.quizId || s.subtopicId}-${i}`, selected: false, due: inDays(7) })))
      setAsked(true)
    } catch (err) {
      console.error(err)
      setError('Could not get suggestions right now. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  function update(key, patch) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  }

  const selected = items.filter((it) => it.selected)
  const allSelected = items.length > 0 && selected.length === items.length

  async function handleAssign() {
    setAssigning(true)
    setError(null)
    setMessage(null)
    const rows = selected.map((it) => ({
      student_id: studentId,
      type: it.type,
      subject_id: it.subjectId || null,
      topic_id: it.topicId || null,
      note: null,
      due_at: it.due ? new Date(it.due).toISOString() : null,
      assigned_by: user.id,
      title: it.title,
      ...(it.type === 'quiz' ? { quiz_id: it.quizId } : { subtopic_id: it.subtopicId }),
    }))
    const { error: insertError } = await supabase.from('assignments').insert(rows)
    setAssigning(false)
    if (insertError) {
      console.error('Failed to assign suggestions', insertError)
      setError('Could not assign those. Nothing was assigned; try again.')
      return
    }
    const done = new Set(selected.map((it) => it.key))
    setItems((prev) => prev.filter((it) => !done.has(it.key)))
    setMessage(`Assigned ${rows.length} item${rows.length === 1 ? '' : 's'} to ${studentName}.`)
  }

  return (
    <section aria-labelledby="suggest-title">
      <h2 id="suggest-title" className="section-label">Suggested assignments</h2>
      <p className={styles.intro}>
        The AI looks at which subjects and topics {studentName} has been avoiding or finding hard, and picks from the quizzes and tutor lessons available. Nothing is assigned until you choose.
      </p>

      {!asked || items.length === 0 ? (
        <button type="button" className="btn btn--primary" onClick={handleSuggest} disabled={loading || !studentId}>
          {loading ? 'Thinking…' : asked ? 'Suggest more' : 'Suggest assignments'}
        </button>
      ) : null}

      {asked && overview && <p className={styles.overview}>{overview}</p>}

      {items.length > 0 && (
        <>
          <div className={styles.toolbar}>
            <label className={styles.selectAll}>
              <input
                type="checkbox"
                className={styles.check}
                checked={allSelected}
                onChange={(e) => setItems((prev) => prev.map((it) => ({ ...it, selected: e.target.checked })))}
              />
              Select all
            </label>
            <button type="button" className="btn btn--secondary btn--small" onClick={handleSuggest} disabled={loading}>
              {loading ? 'Thinking…' : 'Suggest again'}
            </button>
          </div>

          <ul className={styles.list}>
            {items.map((it) => {
              const focus = FOCUS[it.focus] || FOCUS.consolidate
              const checkId = `suggest-${it.key}`
              return (
                <li key={it.key} className={`card ${styles.item}`} data-selected={it.selected || undefined}>
                  <input
                    id={checkId}
                    type="checkbox"
                    className={styles.check}
                    checked={it.selected}
                    onChange={(e) => update(it.key, { selected: e.target.checked })}
                    aria-describedby={`${checkId}-reason`}
                  />
                  <div className={styles.body}>
                    <div className={styles.titleRow}>
                      <label htmlFor={checkId} className={styles.title}>{it.title}</label>
                      <span className="tag">{ASSIGNMENT_TYPE_LABELS[it.type] || it.type}</span>
                      <span className={`tag ${focus.className}`}>{focus.label}</span>
                    </div>
                    <div className="meta">{it.subjectName} · {it.topicName}</div>
                    <p id={`${checkId}-reason`} className={styles.reason}>{it.reason}</p>
                  </div>
                  <div className={styles.due}>
                    <label htmlFor={`${checkId}-due`}>Due</label>
                    <input
                      id={`${checkId}-due`}
                      type="date"
                      className="field"
                      value={it.due}
                      onChange={(e) => update(it.key, { due: e.target.value })}
                    />
                  </div>
                </li>
              )
            })}
          </ul>

          <div className={styles.actions}>
            <button type="button" className="btn btn--primary" onClick={handleAssign} disabled={assigning || selected.length === 0}>
              {assigning ? 'Assigning…' : `Assign selected${selected.length ? ` (${selected.length})` : ''}`}
            </button>
          </div>
        </>
      )}

      <div aria-live="polite">
        {message && <p className={`${styles.status} ${styles.done}`}>{message}</p>}
        {asked && !loading && items.length === 0 && !message && <p className="empty">No suggestions right now.</p>}
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
    </section>
  )
}
