import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useSubjectWallpaper } from '../components/shell/Wallpaper.jsx'
import { fmtDuration, paperSummary, secondsLeft } from '../lib/paper'
import styles from './MockPaper.module.css'

const firstLine = (text) => {
  const line = text.split('\n').find((l) => l.trim()) || ''
  return line.length > 90 ? `${line.slice(0, 89)}…` : line
}

// A mock exam paper set as one assignment: instructions and a start button,
// then the clock and the questions (each answered and marked on the written
// answer page), then the results once it's handed in or every question is done.
export default function MockPaper() {
  const { assignmentId } = useParams()
  const { studentId } = useAuth()
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now())

  const load = useCallback(async () => {
    if (!studentId) return
    setError(null)
    const { data: assignment, error: aErr } = await supabase
      .from('assignments')
      .select('id, title, status, started_at, completed_at, paper_ref, student_id, note')
      .eq('id', assignmentId).eq('type', 'mock_paper').maybeSingle()
    if (aErr || !assignment) {
      if (aErr) console.error('Failed to load paper', aErr)
      setState(null)
      setLoading(false)
      return
    }
    const [paper, questions, attempts] = await Promise.all([
      supabase.from('fm_papers').select('ref, title, duration_minutes, calculator, total_marks, instructions, subjects (name)').eq('ref', assignment.paper_ref).single(),
      supabase.from('fm_exam_questions').select('id, paper_number, total_marks, command_word, question_text, topics (name)').eq('paper_ref', assignment.paper_ref).eq('active', true).order('paper_number'),
      supabase.from('fm_attempts').select('id, question_id, marks_awarded, parent_marks, total_marks, feedback_summary, minutes_earned, minutes_held, needs_review').eq('assignment_id', assignment.id),
    ])
    if (paper.error || questions.error || attempts.error) {
      console.error('Failed to load paper', paper.error || questions.error || attempts.error)
      setError('Could not load the paper. Try refreshing.')
    }
    setState({ assignment, paper: paper.data, questions: questions.data || [], attempts: attempts.data || [] })
    setLoading(false)
  }, [assignmentId, studentId])

  useEffect(() => { load() }, [load])

  const running = state?.assignment.status === 'pending' && !!state?.assignment.started_at
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])

  useSubjectWallpaper(state?.paper?.subjects?.name)
  const summary = useMemo(() => (state ? paperSummary(state.questions, state.attempts) : null), [state])

  async function start() {
    setBusy(true)
    setError(null)
    const { error: rpcErr } = await supabase.rpc('start_paper', { p_assignment: assignmentId })
    if (rpcErr) {
      console.error('Failed to start paper', rpcErr)
      setError('Could not start the paper. Try again.')
    }
    await load()
    setBusy(false)
  }

  async function handIn() {
    const left = summary.questions - summary.answered
    const message = left
      ? `Hand in the paper now? ${left} question${left === 1 ? '' : 's'} not answered will score 0.`
      : 'Hand in the paper now?'
    if (!window.confirm(message)) return
    setBusy(true)
    setError(null)
    const { error: rpcErr } = await supabase.rpc('finish_paper', { p_assignment: assignmentId })
    if (rpcErr) {
      console.error('Failed to hand in paper', rpcErr)
      setError('Could not hand in the paper. Try again.')
    }
    await load()
    setBusy(false)
  }

  if (loading) return <div className="page"><p className="empty">Loading…</p></div>
  if (!state || !state.paper) {
    return (
      <div className="page">
        <Link to="/assignments" className="back-link">← Your week</Link>
        <p className="empty">This paper isn't available.</p>
      </div>
    )
  }

  const { assignment, paper, questions, attempts } = state
  const answeredIds = new Set(attempts.map((a) => a.question_id))
  const attemptFor = new Map(attempts.map((a) => [a.question_id, a]))
  const finished = assignment.status === 'completed'
  const cancelled = assignment.status === 'cancelled'
  const left = secondsLeft(assignment.started_at, paper.duration_minutes, now)
  const nextQuestion = questions.find((q) => !answeredIds.has(q.id))

  return (
    <div className="page">
      <Link to="/assignments" className="back-link">← Your week</Link>
      <h1 className="section-label">{paper.title}</h1>

      <ul className={styles.facts}>
        <li className="tag">{paper.total_marks} marks</li>
        <li className="tag">{paper.duration_minutes} minutes</li>
        <li className={`tag ${paper.calculator ? '' : styles.noCalc}`}>{paper.calculator ? 'Calculator allowed' : 'No calculator'}</li>
      </ul>

      {error && <p className="error-text" role="alert">{error}</p>}

      {cancelled ? (
        <p className="empty">This paper was cancelled.</p>
      ) : finished ? (
        <Results paper={paper} assignment={assignment} questions={questions} attemptFor={attemptFor} summary={summary} />
      ) : !assignment.started_at ? (
        <section className={`card ${styles.intro}`} aria-labelledby="paper-intro">
          <h2 id="paper-intro" className="section-label">Before you start</h2>
          <p>{paper.instructions}</p>
          <ul className={styles.rules}>
            <li>There are {questions.length} questions. Answer them in any order; each one is marked when you submit it.</li>
            <li>The clock starts when you press Start and keeps running if you leave the page, so do it in one sitting.</li>
            <li>When you've answered everything, the paper hands itself in. You can also hand it in early.</li>
          </ul>
          {assignment.note && <p className={styles.note}>Note: {assignment.note}</p>}
          <button type="button" className="btn btn--primary" onClick={start} disabled={busy}>
            {busy ? 'Starting…' : `Start the paper (${paper.duration_minutes} minutes)`}
          </button>
        </section>
      ) : (
        <>
          <div className={`card card--strong ${styles.clock} ${left < 0 ? styles.over : left < 600 ? styles.low : ''}`} role="timer" aria-live="off">
            <div>
              <span className={styles.clockLabel}>{left < 0 ? "Time's up" : 'Time left'}</span>
              <span className={styles.clockValue}>{left < 0 ? `+${fmtDuration(left)}` : fmtDuration(left)}</span>
            </div>
            <div className={styles.progress}>
              <span className={styles.clockLabel}>Answered</span>
              <span className={styles.clockValue}>{summary.answered}/{summary.questions}</span>
            </div>
          </div>
          {left < 0 && <p className={styles.overNote}>In the real exam you'd stop now. Hand the paper in when you're ready.</p>}

          {nextQuestion && (
            <Link to={`/written/${nextQuestion.id}?paper=${assignment.id}`} className={`btn btn--primary ${styles.next}`}>
              {summary.answered === 0 ? 'Start question 1' : `Next: question ${nextQuestion.paper_number}`}
            </Link>
          )}

          <ol className={styles.questions}>
            {questions.map((q) => {
              const done = answeredIds.has(q.id)
              return (
                <li key={q.id}>
                  <Link to={`/written/${q.id}?paper=${assignment.id}`} className={`card ${styles.question} ${done ? styles.answered : ''}`}>
                    <span className={styles.number}>{q.paper_number}</span>
                    <span className={styles.questionText}>
                      <span>{firstLine(q.question_text)}</span>
                      <span className="meta">{q.total_marks} mark{q.total_marks === 1 ? '' : 's'}{q.topics?.name ? ` · ${q.topics.name}` : ''}</span>
                    </span>
                    <span className={styles.status}>{done ? 'Answered' : 'To do'}</span>
                  </Link>
                </li>
              )
            })}
          </ol>

          <div className={styles.handIn}>
            <button type="button" className="btn btn--secondary" onClick={handIn} disabled={busy}>
              {busy ? 'Handing in…' : 'Hand in the paper'}
            </button>
            <span className="meta">Unanswered questions score 0.</span>
          </div>
        </>
      )}
    </div>
  )
}

function Results({ paper, assignment, questions, attemptFor, summary }) {
  const took = assignment.started_at && assignment.completed_at
    ? (new Date(assignment.completed_at) - new Date(assignment.started_at)) / 1000
    : null
  return (
    <section aria-labelledby="paper-results">
      <h2 id="paper-results" className="section-label">Your result</h2>
      <div className={`card card--strong ${styles.score}`} role="status">
        <span>
          <span className={styles.scoreValue}>{summary.marks}</span>
          <span className={styles.scoreOf}> / {summary.available}</span>
        </span>
        <span className={styles.scoreTags}>
          <span className="tag">{summary.percent}%</span>
          <span className="tag">{summary.answered} of {summary.questions} answered</span>
          {took != null && <span className="tag">took {fmtDuration(took)}{took > paper.duration_minutes * 60 ? ' (over time)' : ''}</span>}
          {summary.minutes > 0 && <span className="tag">+{summary.minutes} min</span>}
          {summary.held > 0 && <span className="tag">+{summary.held} min on hold</span>}
        </span>
      </div>
      {summary.toReview > 0 && (
        <p className={styles.reviewNote}>{summary.toReview} answer{summary.toReview === 1 ? ' is' : 's are'} waiting for Dad to check, so your total could change.</p>
      )}

      <h3 className="section-label">By topic</h3>
      <ul className={styles.topics}>
        {summary.byTopic.map((t) => (
          <li key={t.topic} className={styles.topicRow}>
            <span>{t.topic}</span>
            <span className={styles.bar} aria-hidden="true"><span style={{ width: `${t.available ? (t.marks / t.available) * 100 : 0}%` }} /></span>
            <span className={styles.topicMarks}>{t.marks}/{t.available}</span>
          </li>
        ))}
      </ul>

      <h3 className="section-label">Question by question</h3>
      <ol className={styles.questions}>
        {questions.map((q) => {
          const a = attemptFor.get(q.id)
          const marks = a ? (a.parent_marks ?? a.marks_awarded) : null
          return (
            <li key={q.id}>
              {a ? (
                <Link to={`/written/${q.id}?paper=${assignment.id}`} className={`card ${styles.question}`}>
                  <span className={styles.number}>{q.paper_number}</span>
                  <span className={styles.questionText}>
                    <span>{firstLine(q.question_text)}</span>
                    {a.feedback_summary && <span className="meta">{a.feedback_summary}</span>}
                  </span>
                  <span className={`${styles.status} ${marks === q.total_marks ? styles.full : marks === 0 ? styles.zero : ''}`}>{marks}/{q.total_marks}</span>
                </Link>
              ) : (
                <div className={`card ${styles.question} ${styles.skipped}`}>
                  <span className={styles.number}>{q.paper_number}</span>
                  <span className={styles.questionText}>
                    <span>{firstLine(q.question_text)}</span>
                    <span className="meta">Not answered</span>
                  </span>
                  <span className={`${styles.status} ${styles.zero}`}>0/{q.total_marks}</span>
                </div>
              )}
            </li>
          )
        })}
      </ol>
      <Link to="/assignments" className="btn btn--primary">Back to your week</Link>
    </section>
  )
}
