import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import styles from './WrittenWork.module.css'

const fmtDate = (iso) => new Date(iso).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

function Scheme({ questionId }) {
  const [scheme, setScheme] = useState(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open || scheme) return
    supabase.from('fm_mark_schemes').select('marking_style, scheme, spag_marks').eq('question_id', questionId).single()
      .then(({ data }) => setScheme(data || { scheme: {} }))
  }, [open, scheme, questionId])
  const s = scheme?.scheme || {}
  return (
    <details className={styles.scheme} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Mark scheme</summary>
      {!scheme ? <p className="empty">Loading…</p> : (
        <ul className={styles.points}>
          {(s.points || []).map((p, i) => <li key={`p${i}`}>{p}</li>)}
          {(s.levels || []).map((l) => <li key={`l${l.level}`}>Level {l.level} ({l.marks[0]}–{l.marks[1]}): {l.descriptor}</li>)}
          {(s.indicative || []).map((p, i) => <li key={`i${i}`}>{p}</li>)}
          {s.guidance && <li>{s.guidance}</li>}
        </ul>
      )}
    </details>
  )
}

const mins = (ms) => Math.max(1, Math.round(ms / 60000))

// How the answer was produced and any AI-writing signs (parents only).
function Integrity({ integrity }) {
  if (!integrity) return null
  const t = integrity.typing || {}
  const ai = integrity.ai || {}
  return (
    <div className={`card ${styles.integrity} ${integrity.flagged ? styles.integrityFlagged : ''}`}>
      <h4 className="section-label">Integrity check</h4>
      {integrity.flagged ? (
        <ul className={styles.points}>{integrity.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
      ) : (
        <p className={styles.text}>No signs of copying or AI writing.</p>
      )}
      {t.recorded && (
        <p className={styles.runs}>
          Typed {t.typedChars} chars · pasted {t.pastedChars} ({t.pasteCount} paste{t.pasteCount === 1 ? '' : 's'}) · active about {mins(t.activeMs)} min
          {t.cpm != null ? ` · ${t.cpm} chars/min` : ''} · left the tab {t.tabAways}×
        </p>
      )}
      {ai.likelihood && (
        <>
          <p className={styles.runs}>AI-written likelihood: {ai.likelihood}</p>
          {[...(ai.signals || []).slice(0, 3), ...(ai.phraseSignals || [])].length > 0 && (
            <ul className={`${styles.points} ${styles.small}`}>
              {[...(ai.signals || []).slice(0, 3), ...(ai.phraseSignals || [])].map((sig, i) => <li key={i}>{sig}</li>)}
            </ul>
          )}
        </>
      )}
      <p className="meta">Detection can be wrong either way, so treat this as a reason to ask, not proof.</p>
    </div>
  )
}

function Review({ attempt, onSaved }) {
  const [marks, setMarks] = useState(attempt.parent_marks ?? attempt.marks_awarded)
  const [note, setNote] = useState(attempt.parent_note || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  async function save() {
    setSaving(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('review_written_attempt', { p_attempt: attempt.id, p_marks: Number(marks), p_note: note })
    setSaving(false)
    if (rpcError) {
      console.error('Failed to save review', rpcError)
      setError('Could not save the mark. Try again.')
      return
    }
    onSaved()
  }
  return (
    <div className={`card ${styles.review}`}>
      <h4 className="section-label">Your mark</h4>
      <div className={styles.reviewRow}>
        <div>
          <label className="field-label" htmlFor={`rev-${attempt.id}`}>Marks</label>
          <input id={`rev-${attempt.id}`} className="field" type="number" min="0" max={attempt.total_marks} value={marks} onChange={(e) => setMarks(e.target.value)} />
        </div>
        <span className="meta">/ {attempt.total_marks}</span>
      </div>
      <div>
        <label className="field-label" htmlFor={`note-${attempt.id}`}>Note (optional, shown with the mark)</label>
        <input id={`note-${attempt.id}`} className="field" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button type="button" className="btn btn--primary btn--small" onClick={save} disabled={saving || marks === '' || Number(marks) < 0 || Number(marks) > attempt.total_marks}>
        {saving ? 'Saving…' : 'Save mark'}
      </button>
      {error && <p className="error-text" role="alert">{error}</p>}
      <p className="meta">Minutes already earned don't change.</p>
    </div>
  )
}

// Recent written answers for the parent: the AI mark, a flag when the two
// markings disagreed, the answer and feedback, and an override.
export default function WrittenWork({ studentId, studentName }) {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState(null)

  const load = useCallback(async () => {
    if (!studentId) return
    const { data, error } = await supabase
      .from('fm_attempts')
      .select('*, fm_exam_questions (question_text, command_word, subtopics (name), topics (name, subjects (name)))')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false })
      .limit(20)
    if (error) console.error('Failed to load written work', error)
    setAttempts(data || [])
    setLoading(false)
  }, [studentId])

  useEffect(() => { load() }, [load])

  const toCheck = attempts.filter((a) => a.needs_review).length

  return (
    <section aria-labelledby="written-title">
      <h2 id="written-title" className="section-label">Written work</h2>
      <p className={styles.intro}>
        Answers are marked twice by the AI against the mark scheme. It's flagged for you to check where the two markings disagree by more than 10% of the marks, or where there are signs of pasting or AI writing.
        {toCheck > 0 ? ` ${toCheck} to check.` : ''}
      </p>
      {loading ? <p className="empty">Loading…</p> : attempts.length === 0 ? (
        <p className="empty">No written answers from {studentName} yet. Assign a written test from Assign work.</p>
      ) : (
        <ul className={styles.list}>
          {attempts.map((a) => {
            const q = a.fm_exam_questions || {}
            const marks = a.parent_marks ?? a.marks_awarded
            const open = openId === a.id
            return (
              <li key={a.id} className={styles.item}>
                <button type="button" className={styles.row} aria-expanded={open} onClick={() => setOpenId(open ? null : a.id)}>
                  <span>
                    <span className={styles.title}>{q.subtopics?.name || 'Written answer'}</span>
                    {a.needs_review && <span className={`tag ${styles.flag}`}>Check</span>}
                    {a.integrity?.flagged && <span className={`tag ${styles.flag} ${styles.integrityTag}`}>Integrity</span>}
                    <span className={`meta ${styles.sub}`}>
                      {q.topics?.subjects?.name} · {fmtDate(a.submitted_at)}{a.parent_marks != null ? ' · checked by you' : ''}
                    </span>
                  </span>
                  <span className={styles.score}>{marks}/{a.total_marks}<span className={`meta ${styles.sub}`}>{Math.round((marks / a.total_marks) * 100)}%</span></span>
                </button>
                {open && (
                  <div className={styles.detail}>
                    <div className={styles.block}>
                      <h4 className="section-label">The question</h4>
                      <p className={`${styles.text} meta`}>{q.question_text}</p>
                      <h4 className="section-label">{studentName}'s answer</h4>
                      <p className={`card ${styles.text} ${styles.answer}`}>{a.transcribed_answer}</p>
                    </div>
                    <div className={styles.block}>
                      <h4 className="section-label">AI feedback{a.level != null ? ` · Level ${a.level}` : ''}</h4>
                      <p className={styles.text}>{a.feedback_summary}</p>
                      {(a.credited || []).length > 0 && <ul className={`${styles.points} ${styles.marked}`}>{a.credited.map((c, i) => <li key={i}>✓ {c}</li>)}</ul>}
                      {(a.missing || []).length > 0 && <ul className={`${styles.points} ${styles.marked}`}>{a.missing.map((c, i) => <li key={i}>✗ {c}</li>)}</ul>}
                      {Array.isArray(a.marking_runs) && (
                        <p className={styles.runs}>Two markings: {a.marking_runs.map((r) => (r ? r.marks : '–')).join(' and ')} → {a.marks_awarded}</p>
                      )}
                      <Integrity integrity={a.integrity} />
                      <Scheme questionId={a.question_id} />
                      <Review attempt={a} onSaved={load} />
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
