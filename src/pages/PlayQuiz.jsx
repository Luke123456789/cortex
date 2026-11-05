import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import card from '../components/QuestionCard.module.css'
import styles from './PlayQuiz.module.css'

const optionKeys = ['a', 'b', 'c', 'd']

export default function PlayQuiz() {
  const { quizId } = useParams()
  // The student themselves, or a parent's practice student (see useAuth).
  const { studentId } = useAuth()
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  // Which question is on screen. Presentation only: answers are still
  // collected for every question and submitted together, as before.
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: quizRow } = await supabase.from('quizzes').select('id, title').eq('id', quizId).single()
      setQuiz(quizRow)

      // Deliberately omits correct_option/explanation — those only come back
      // in the grade-quiz-session response, after the student has submitted.
      const { data: rows } = await supabase
        .from('quiz_questions')
        .select('position, questions (id, question_text, option_a, option_b, option_c, option_d, difficulty, question_type)')
        .eq('quiz_id', quizId)
        .order('position')
      setQuestions((rows || []).map((r) => r.questions).filter(Boolean))
      setLoading(false)
    }
    load()
  }, [quizId])

  function selectAnswer(questionId, option) {
    setAnswers((prev) => ({ ...prev, [questionId]: option.toUpperCase() }))
  }

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id])

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grade-quiz-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          studentId,
          quizId,
          answers: Object.entries(answers).map(([questionId, selectedOption]) => ({ questionId, selectedOption })),
        }),
      })
      let data = null
      try {
        data = await res.json()
      } catch {
        // Non-JSON body (e.g. a gateway error page) — fall through to the
        // generic message below rather than crashing on the parse.
      }
      if (!res.ok) throw new Error(data?.error || `Quiz submission failed (${res.status})`)
      setResult(data)
    } catch (err) {
      console.error(err)
      setError(err.message.startsWith('Quiz submission failed') ? 'Could not submit the quiz. Try again.' : err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Keyboard: A-D or 1-4 picks an option for the question on screen; Enter
  // moves on once it's answered, and submits from the last question.
  const keyState = useRef({})
  keyState.current = { questions, current, answers, allAnswered, submitting, result, loading }
  useEffect(() => {
    function handleKeyDown(e) {
      const st = keyState.current
      if (st.loading || st.result || e.altKey || e.ctrlKey || e.metaKey) return
      const target = e.target
      if (target.closest && target.closest('input, textarea, select, [contenteditable="true"]')) return
      const q = st.questions[st.current]
      if (!q) return
      const key = e.key.toLowerCase()
      const index = 'abcd'.indexOf(key) >= 0 && key.length === 1 ? 'abcd'.indexOf(key) : '1234'.indexOf(key)
      if (key.length === 1 && index >= 0) {
        e.preventDefault()
        selectAnswer(q.id, optionKeys[index])
        return
      }
      if (e.key === 'Enter') {
        // Let Enter activate a focused button or link normally.
        if (target.closest && target.closest('button, a')) return
        if (!st.answers[q.id]) return
        e.preventDefault()
        if (st.current < st.questions.length - 1) setCurrent(st.current + 1)
        else if (st.allAnswered && !st.submitting) handleSubmit()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  if (loading) {
    return (
      <div className="page">
        <p className="empty">Loading…</p>
      </div>
    )
  }

  if (result) {
    const resultByQuestionId = {}
    for (const r of result.results) resultByQuestionId[r.questionId] = r

    return (
      <div className="page">
        <h1 className="section-label">Quiz complete</h1>
        <div className={`card card--strong ${styles.score}`} role="status">
          <div className={styles.scoreValue}>{result.score} / {result.totalCount} correct</div>
          {result.minutesAwarded > 0 ? (
            <div className={styles.earned}>+{result.minutesAwarded} min earned</div>
          ) : (
            <div className="meta">No minutes earned this time</div>
          )}
        </div>

        <ol className={styles.results}>
          {questions.map((q, i) => {
            const r = resultByQuestionId[q.id]
            return (
              <li key={q.id} className={`card ${card.card}`}>
                <div className={card.top}>
                  <span className="meta">Q{i + 1}</span>
                  <span className={`${styles.verdict} ${r?.correct ? 'text-earn' : 'text-spend'}`}>
                    {r?.correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                <p className={card.text}>{q.question_text}</p>
                <ul className={card.options}>
                  {optionKeys.map((k) => {
                    const letter = k.toUpperCase()
                    const isCorrect = r?.correctOption === letter
                    const isSelected = r?.selectedOption === letter
                    return (
                      <li key={k} className={`${card.option} ${isCorrect ? card.correct : isSelected ? card.wrong : ''}`}>
                        <span className={card.letter}>{letter}</span>
                        <span>{q[`option_${k}`]}</span>
                        {isSelected && <span className="visually-hidden"> (your answer)</span>}
                        {isCorrect && <span className="visually-hidden"> (correct answer)</span>}
                      </li>
                    )
                  })}
                </ul>
                {r?.explanation && <p className={card.explanation}>{r.explanation}</p>}
              </li>
            )
          })}
        </ol>

        <Link to="/" className="btn btn--primary btn--block">Done</Link>
      </div>
    )
  }

  const total = questions.length
  const q = questions[current]
  const isLast = current === total - 1
  const answeredCount = questions.filter((x) => answers[x.id]).length
  const unanswered = total - answeredCount

  return (
    <div className="page">
      <Link to="/" className="back-link">← Back</Link>

      <div className={styles.head}>
        <h1 className={`section-label ${styles.title}`}>{quiz?.title || 'Quiz'}</h1>
        <div className={styles.progressRow}>
          <span className="meta">{total ? `Question ${current + 1} of ${total}` : '0 question(s)'}</span>
          <span className="meta">{answeredCount} answered</span>
        </div>
        <div className={styles.progress} aria-hidden="true">
          <div className={styles.progressFill} style={{ width: `${total ? (answeredCount / total) * 100 : 0}%` }} />
        </div>
      </div>

      {q && (
        <section className={`card ${card.card} ${styles.questionCard}`} aria-labelledby="play-question">
          <span className="meta">Q{current + 1}</span>
          <p id="play-question" className={card.text}>{q.question_text}</p>
          <div className={card.options} role="radiogroup" aria-labelledby="play-question">
            {optionKeys.map((k) => {
              const letter = k.toUpperCase()
              const isSelected = answers[q.id] === letter
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`${card.option} ${card.choice}`}
                  onClick={() => selectAnswer(q.id, letter)}
                >
                  <span className={card.letter} aria-hidden="true">{letter}</span>
                  <span>{q[`option_${k}`]}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {total > 1 && (
        <ol className={styles.jump} aria-label="Questions">
          {questions.map((x, i) => (
            <li key={x.id}>
              <button
                type="button"
                className={styles.jumpBtn}
                data-answered={answers[x.id] ? '' : undefined}
                aria-current={i === current ? 'step' : undefined}
                aria-label={`Question ${i + 1}${answers[x.id] ? ', answered' : ''}`}
                onClick={() => setCurrent(i)}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ol>
      )}

      {error && <p className={`error-text ${styles.error}`} role="alert">{error}</p>}

      <div className={styles.nav}>
        <button type="button" className="btn btn--secondary" onClick={() => setCurrent(current - 1)} disabled={current === 0}>
          Previous
        </button>
        {isLast || total === 0 ? (
          <button type="button" className="btn btn--primary" onClick={handleSubmit} disabled={!allAnswered || submitting}>
            {submitting ? 'Submitting…' : 'Submit answers'}
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={() => setCurrent(current + 1)}>
            Next
          </button>
        )}
      </div>

      {isLast && unanswered > 0 && (
        <p className={`meta ${styles.status}`}>{unanswered} question{unanswered === 1 ? '' : 's'} still to answer</p>
      )}

      <p className={`meta ${styles.hint}`}>
        <kbd>A</kbd>–<kbd>D</kbd> or <kbd>1</kbd>–<kbd>4</kbd> to choose · <kbd>Enter</kbd> for next{isLast ? ' / submit' : ''}
      </p>
    </div>
  )
}
