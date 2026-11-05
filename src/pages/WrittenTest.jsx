import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { commandWordHint } from '../../supabase/functions/mark-written-answer/marking-logic.js'
import styles from './WrittenTest.module.css'

const draftKey = (studentId, questionId) => `cortex:written-draft:${studentId}:${questionId}`

function readDraft(key) {
  try { return localStorage.getItem(key) || '' } catch { return '' }
}

function writeDraft(key, value) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    // Storage unavailable (private window etc.): drafts just aren't kept.
  }
}

// How the answer was produced, sent with it for the parent's integrity
// check. Kept with the draft so a reload doesn't reset it.
const EMPTY_TELEMETRY = { typedChars: 0, pastedChars: 0, pasteCount: 0, largestPaste: 0, droppedChars: 0, activeMs: 0, tabAways: 0, inputEvents: 0 }
const IDLE_GAP_MS = 20000

function readTelemetry(key) {
  try { return { ...EMPTY_TELEMETRY, ...JSON.parse(localStorage.getItem(`${key}:t`) || '{}') } } catch { return { ...EMPTY_TELEMETRY } }
}

function writeTelemetry(key, value) {
  try {
    if (value) localStorage.setItem(`${key}:t`, JSON.stringify(value))
    else localStorage.removeItem(`${key}:t`)
  } catch {
    // Storage unavailable: the record still goes with this session's answer.
  }
}

const wordCount = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0)
const fmtClock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Exam pace: AQA papers allow roughly 1 to 1.3 minutes per mark.
const suggestedMinutes = (marks) => Math.max(2, Math.round(marks * 1.2))

function Result({ attempt, question }) {
  const marks = attempt.parent_marks ?? attempt.marks_awarded
  const credited = attempt.credited || []
  const missing = attempt.missing || []
  return (
    <section aria-labelledby="result-title">
      <h2 id="result-title" className="section-label">Your mark</h2>
      <div className={`card card--strong ${styles.score}`} role="status">
        <span><span className={styles.scoreValue}>{marks}</span><span className={styles.scoreOf}> / {attempt.total_marks}</span></span>
        <span className={styles.scoreTags}>
          {attempt.level != null && <span className="tag">Level {attempt.level}</span>}
          <span className="tag">{attempt.parent_marks != null ? 'Checked' : 'AI-marked'}</span>
          {attempt.minutes_earned > 0 && <span className={`tag ${styles.earned}`}>+{attempt.minutes_earned} min</span>}
        </span>
      </div>

      {attempt.parent_marks != null && (
        <p className={styles.checked}>
          Your mark was checked and set to {attempt.parent_marks}/{attempt.total_marks}
          {attempt.parent_note ? `: ${attempt.parent_note}` : '.'}
        </p>
      )}

      {attempt.feedback_summary && <p className={styles.summary}>{attempt.feedback_summary}</p>}

      <div className={styles.feedback}>
        {credited.length > 0 && (
          <div className={styles.good}>
            <h3 className="section-label">What got marks</h3>
            <ul>{credited.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>
        )}
        {missing.length > 0 && (
          <div className={styles.more}>
            <h3 className="section-label">What would get more</h3>
            <ul>{missing.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>
        )}
      </div>

      {attempt.next_step && (
        <p className={styles.next}><strong>Next time: </strong>{attempt.next_step}</p>
      )}

      <details className={styles.yourAnswer}>
        <summary>Your answer</summary>
        <p>{attempt.transcribed_answer}</p>
      </details>

      <details className={styles.yourAnswer}>
        <summary>The question</summary>
        <p>{question.question_text}</p>
      </details>

      <Link to="/assignments" className="btn btn--primary">Back to your week</Link>
    </section>
  )
}

// Answer a written (exam-style) question and see the AI marking.
export default function WrittenTest() {
  const { questionId } = useParams()
  const { studentId } = useAuth()
  const [question, setQuestion] = useState(null)
  const [pending, setPending] = useState(false)
  const [attempt, setAttempt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [timerStart, setTimerStart] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const key = draftKey(studentId, questionId)
  const loaded = useRef(false)
  const answerRef = useRef(null)
  const telemetry = useRef({ ...EMPTY_TELEMETRY })
  const lastInputAt = useRef(0)

  useEffect(() => {
    if (!studentId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const [q, a, latest] = await Promise.all([
        supabase.from('fm_exam_questions').select('id, question_text, command_word, total_marks, topics (name, subjects (name))').eq('id', questionId).single(),
        supabase.from('assignments').select('id').eq('student_id', studentId).eq('type', 'written_test').eq('exam_question_id', questionId).eq('status', 'pending').limit(1),
        supabase.from('fm_attempts').select('*').eq('student_id', studentId).eq('question_id', questionId).order('submitted_at', { ascending: false }).limit(1),
      ])
      if (cancelled) return
      if (q.error) console.error('Failed to load question', q.error)
      setQuestion(q.data || null)
      setPending((a.data || []).length > 0)
      setAttempt((latest.data || [])[0] || null)
      if (!loaded.current) {
        setAnswer(readDraft(key))
        telemetry.current = readTelemetry(key)
        loaded.current = true
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [questionId, studentId, key])

  // Record how text arrives in the answer box: typed (including phone
  // keyboards and autocorrect), pasted or dropped, plus active time and tab
  // switches. Monitoring only; nothing is blocked.
  useEffect(() => {
    const el = answerRef.current
    if (!el) return
    const t = telemetry.current
    const save = () => writeTelemetry(key, telemetry.current)
    function tick() {
      const now = Date.now()
      if (lastInputAt.current && now - lastInputAt.current <= IDLE_GAP_MS) t.activeMs += now - lastInputAt.current
      lastInputAt.current = now
      t.inputEvents += 1
    }
    function onBeforeInput(e) {
      tick()
      if (e.inputType === 'insertFromDrop') {
        t.droppedChars += (e.dataTransfer?.getData('text') || '').length
      } else if (e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph') {
        t.typedChars += 1
      } else if (e.inputType && e.inputType.startsWith('insert') && e.inputType !== 'insertFromPaste' && e.inputType !== 'insertFromPasteAsQuotation') {
        t.typedChars += (e.data || '').length
      }
      save()
    }
    function onPaste(e) {
      const len = (e.clipboardData?.getData('text') || '').length
      t.pastedChars += len
      t.pasteCount += 1
      t.largestPaste = Math.max(t.largestPaste, len)
      save()
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden' && answerRef.current?.value) {
        t.tabAways += 1
        save()
      }
    }
    el.addEventListener('beforeinput', onBeforeInput)
    el.addEventListener('paste', onPaste)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      el.removeEventListener('beforeinput', onBeforeInput)
      el.removeEventListener('paste', onPaste)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [key, pending, loading])

  useEffect(() => {
    if (!timerStart) return
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - timerStart) / 1000)), 1000)
    return () => clearInterval(id)
  }, [timerStart])

  function onChange(value) {
    setAnswer(value)
    writeDraft(key, value)
  }

  async function handleSubmit() {
    const words = wordCount(answer)
    if (words < question.total_marks * 5 &&
      !window.confirm(`That's quite short for a ${question.total_marks}-mark question. Submit it for marking anyway?`)) return
    setSubmitting(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mark-written-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ questionId, answer, studentId, telemetry: telemetry.current }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Marking failed. Try again in a moment.')
      writeDraft(key, '')
      writeTelemetry(key, null)
      const { data: saved } = await supabase.from('fm_attempts').select('*').eq('id', data.attemptId).single()
      setAttempt(saved || null)
      setPending(false)
      setTimerStart(null)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Marking failed. Try again in a moment.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="page"><p className="empty">Loading…</p></div>
  if (!question) return <div className="page"><p className="empty">This question isn't available.</p><Link to="/assignments" className="back-link">← Your week</Link></div>

  const subject = question.topics?.subjects?.name
  const hint = commandWordHint(question.command_word)
  const minutes = suggestedMinutes(question.total_marks)
  const words = wordCount(answer)

  return (
    <div className="page">
      <Link to="/assignments" className="back-link">← Your week</Link>
      <div className={styles.head}>
        <h1 className="section-label">Written answer{subject ? ` · ${subject}` : ''}</h1>
      </div>

      {!pending && attempt ? (
        <Result attempt={attempt} question={question} />
      ) : !pending ? (
        <p className="empty">This question hasn't been set for you.</p>
      ) : (
        <>
          <article className={`card ${styles.question}`}>
            <div className={styles.questionMeta}>
              <span className="tag">{question.total_marks} marks</span>
              <span className="tag">{question.command_word}</span>
              {question.topics?.name && <span className="meta">{question.topics.name}</span>}
            </div>
            <p className={styles.questionText}>{question.question_text}</p>
          </article>

          {hint && (
            <p className={styles.hint}>
              <strong>{question.command_word[0].toUpperCase() + question.command_word.slice(1)}</strong> means: {hint}.
            </p>
          )}

          <div className={styles.timerRow}>
            <label htmlFor="written-answer" className="field-label">Your answer</label>
            <span className="meta">
              Suggested time: about {minutes} minutes{' · '}
              {timerStart ? (
                <span className={`${styles.timer} ${elapsed > minutes * 60 ? styles.over : ''}`} aria-live="off">{fmtClock(elapsed)}</span>
              ) : (
                <button type="button" className="link" onClick={() => { setTimerStart(Date.now()); setElapsed(0) }}>start timer</button>
              )}
            </span>
          </div>
          <textarea
            ref={answerRef}
            id="written-answer"
            className={`field ${styles.answer}`}
            rows={12}
            value={answer}
            onChange={(e) => onChange(e.target.value)}
            disabled={submitting}
            // No spellchecker where spelling is marked, as in the real exam.
            spellCheck={!/spelling, punctuation and grammar/i.test(question.question_text)}
          />
          <div className={styles.answerFooter}>
            <span className="meta">{words} word{words === 1 ? '' : 's'} · saved on this device · pasted text is recorded</span>
            <button type="button" className="btn btn--primary" onClick={handleSubmit} disabled={submitting || !answer.trim()}>
              {submitting ? 'Marking…' : 'Submit for marking'}
            </button>
          </div>

          {submitting && (
            <p className={`card ${styles.marking}`} role="status">Marking your answer against the mark scheme. This can take up to a minute.</p>
          )}
          {error && <p className="error-text" role="alert">{error}</p>}
        </>
      )}
    </div>
  )
}
