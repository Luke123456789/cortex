import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'

const MINUTES_PER_CORRECT_ANSWER = 1
const optionKeys = ['a', 'b', 'c', 'd']

export default function Play() {
  const { quizId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [lockedUntil, setLockedUntil] = useState(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answers, setAnswers] = useState([])
  const [finished, setFinished] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: quizRow } = await supabase
        .from('quizzes')
        .select('id, title, topic_id, cooldown_hours, question_count')
        .eq('id', quizId)
        .single()
      setQuiz(quizRow)

      if (quizRow && user) {
        const { data: lastSession } = await supabase
          .from('quiz_sessions')
          .select('completed_at')
          .eq('student_id', user.id)
          .eq('quiz_id', quizId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (lastSession) {
          const unlockAt = new Date(lastSession.completed_at).getTime() + quizRow.cooldown_hours * 60 * 60 * 1000
          if (Date.now() < unlockAt) {
            setLockedUntil(new Date(unlockAt))
          }
        }
      }

      const { data: quizQuestionRows } = await supabase
        .from('quiz_questions')
        .select('position, questions (id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)')
        .eq('quiz_id', quizId)
        .order('position')

      setQuestions((quizQuestionRows || []).map((row) => row.questions))
      setLoading(false)
    }
    load()
  }, [quizId, user])

  function selectOption(key) {
    if (selected) return
    setSelected(key)
  }

  function nextQuestion() {
    const question = questions[currentIndex]
    const isCorrect = selected?.toLowerCase() === question.correct_option.toLowerCase()
    const newAnswers = [...answers, { questionId: question.id, selected, isCorrect }]
    setAnswers(newAnswers)
    setSelected(null)

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1)
    } else {
      finishQuiz(newAnswers)
    }
  }

  async function finishQuiz(finalAnswers) {
    setSubmitting(true)
    const score = finalAnswers.filter((a) => a.isCorrect).length
    const minutesEarned = score * MINUTES_PER_CORRECT_ANSWER

    const { data: sessionRow, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({
        student_id: user.id,
        quiz_id: quizId,
        topic_id: quiz.topic_id,
        quiz_format: 'standard',
        question_count: questions.length,
        score,
        xp_earned: minutesEarned,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (sessionError) console.error('Failed to record quiz session', sessionError)

    if (sessionRow) {
      const historyRows = finalAnswers.map((a) => ({
        student_id: user.id,
        question_id: a.questionId,
        answered_correctly: a.isCorrect,
        quiz_session_id: sessionRow.id,
      }))
      const { error: historyError } = await supabase.from('student_question_history').insert(historyRows)
      if (historyError) console.error('Failed to log question history', historyError)
    }

    if (minutesEarned > 0) {
      const { error: ledgerError } = await supabase.from('ledger_entries').insert({
        type: 'earn',
        amount_minutes: minutesEarned,
        source: `Quiz: ${quiz.title}`,
      })
      if (ledgerError) console.error('Failed to log ledger reward', ledgerError)
    }

    setSubmitting(false)
    setFinished(true)
  }

  if (loading) {
    return (
      <div className="device">
        <div className="screen">
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>Loading…</div>
        </div>
      </div>
    )
  }

  if (lockedUntil) {
    return (
      <div className="device">
        <div className="screen">
          <div className="wordmark" style={{ marginBottom: '18px' }}>CORTEX</div>
          <div className="section-label">{quiz?.title}</div>
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)', marginBottom: '16px' }}>
            You've already done this one recently. It unlocks again on {lockedUntil.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}.
          </div>
          <Link to="/" style={{ fontSize: '12px', color: 'var(--brass)', textDecoration: 'underline' }}>Back to home</Link>
        </div>
      </div>
    )
  }

  if (finished) {
    const score = answers.filter((a) => a.isCorrect).length
    return (
      <div className="device">
        <div className="screen">
          <div className="wordmark" style={{ marginBottom: '18px' }}>CORTEX</div>
          <div className="section-label">{quiz.title} · done</div>
          <div style={{ fontSize: '28px', fontWeight: 600, marginBottom: '6px' }}>{score} / {questions.length}</div>
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)', marginBottom: '20px' }}>
            {score * MINUTES_PER_CORRECT_ANSWER} minutes earned. This quiz will be locked for {quiz.cooldown_hours} hours.
          </div>
          <Link
            to="/"
            style={{
              display: 'inline-block',
              background: 'var(--ink)',
              color: 'var(--paper)',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  const question = questions[currentIndex]
  if (!question) {
    return (
      <div className="device">
        <div className="screen">
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>This quiz has no questions yet.</div>
          <Link to="/" style={{ fontSize: '12px', color: 'var(--brass)', textDecoration: 'underline' }}>Back to home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="device">
      <div className="screen">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div className="wordmark">CORTEX</div>
          <span className="mono" style={{ fontSize: '10.5px', color: 'var(--ink-faint)' }}>
            {currentIndex + 1} / {questions.length}
          </span>
        </div>

        <div style={{ fontSize: '15px', lineHeight: 1.5, marginBottom: '16px' }}>{question.question_text}</div>

        <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
          {optionKeys.map((k) => {
            const isSelected = selected === k
            const isCorrectAnswer = question.correct_option.toLowerCase() === k
            const showFeedback = selected !== null
            let bg = 'var(--card)'
            let border = 'var(--rule)'
            let color = 'var(--ink)'
            if (showFeedback && isCorrectAnswer) {
              bg = 'var(--green-bg)'; border = 'var(--green)'; color = 'var(--green)'
            } else if (showFeedback && isSelected && !isCorrectAnswer) {
              bg = 'var(--red-bg)'; border = 'var(--red)'; color = 'var(--red)'
            }
            return (
              <button
                key={k}
                onClick={() => selectOption(k)}
                disabled={selected !== null}
                style={{
                  textAlign: 'left',
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  color,
                  cursor: selected !== null ? 'default' : 'pointer',
                }}
              >
                <strong style={{ marginRight: '8px' }}>{k.toUpperCase()}</strong>
                {question[`option_${k}`]}
              </button>
            )
          })}
        </div>

        {selected !== null && (
          <>
            <div
              style={{
                background: question.correct_option.toLowerCase() === selected ? 'var(--green-bg)' : 'var(--red-bg)',
                border: `1px solid ${question.correct_option.toLowerCase() === selected ? 'var(--green)' : 'var(--red)'}`,
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  color: question.correct_option.toLowerCase() === selected ? 'var(--green)' : 'var(--red)',
                  marginBottom: '4px',
                  fontWeight: 600,
                }}
              >
                {question.correct_option.toLowerCase() === selected ? 'Correct' : 'Not quite'}
              </div>
              <div style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--ink)' }}>
                {question.explanation}
              </div>
            </div>
            <button
              onClick={nextQuestion}
              disabled={submitting}
              style={{
                width: '100%',
                background: 'var(--ink)',
                color: 'var(--paper)',
                border: 'none',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {currentIndex + 1 < questions.length ? 'Next question' : submitting ? 'Finishing…' : 'Finish quiz'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
