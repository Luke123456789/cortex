import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const optionKeys = ['a', 'b', 'c', 'd']

export default function PlayQuiz() {
  const { quizId } = useParams()
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

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

  if (loading) {
    return (
      <div className="device">
        <div className="screen" style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>Loading…</div>
      </div>
    )
  }

  if (result) {
    const resultByQuestionId = {}
    for (const r of result.results) resultByQuestionId[r.questionId] = r

    return (
      <div className="device">
        <div className="screen">
          <div className="wordmark" style={{ marginBottom: '18px' }}>CORTEX</div>
          <div className="section-label">Quiz complete</div>
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--rule-strong)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '18px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{result.score} / {result.totalCount} correct</div>
            {result.minutesAwarded > 0 ? (
              <div className="mono" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--green)' }}>+{result.minutesAwarded} min earned</div>
            ) : (
              <div className="mono" style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>No minutes earned this time</div>
            )}
          </div>

          {questions.map((q, i) => {
            const r = resultByQuestionId[q.id]
            return (
              <div key={q.id} style={{ background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '13px 14px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="mono" style={{ fontSize: '9.5px', color: 'var(--ink-faint)' }}>Q{i + 1}</span>
                  <span className="mono" style={{ fontSize: '10.5px', fontWeight: 600, color: r?.correct ? 'var(--green)' : 'var(--red)' }}>
                    {r?.correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', marginBottom: '9px', lineHeight: 1.5 }}>{q.question_text}</div>
                <div style={{ display: 'grid', gap: '5px', marginBottom: r?.explanation ? '8px' : 0 }}>
                  {optionKeys.map((k) => {
                    const letter = k.toUpperCase()
                    const isCorrect = r?.correctOption === letter
                    const isSelected = r?.selectedOption === letter
                    return (
                      <div
                        key={k}
                        style={{
                          fontSize: '12px',
                          padding: '6px 9px',
                          borderRadius: '6px',
                          border: `1px solid ${isCorrect ? 'var(--green)' : isSelected ? 'var(--red)' : 'var(--rule)'}`,
                          background: isCorrect ? 'var(--green-bg)' : 'transparent',
                          color: isCorrect ? 'var(--green)' : isSelected ? 'var(--red)' : 'var(--ink-soft)',
                        }}
                      >
                        <strong style={{ marginRight: '7px' }}>{letter}</strong>
                        {q[`option_${k}`]}
                      </div>
                    )
                  })}
                </div>
                {r?.explanation && (
                  <div style={{ fontSize: '11px', color: 'var(--ink-faint)', fontStyle: 'italic', borderTop: '1px solid var(--rule)', paddingTop: '7px' }}>
                    {r.explanation}
                  </div>
                )}
              </div>
            )
          })}

          <Link
            to="/"
            style={{ display: 'block', textAlign: 'center', background: 'var(--ink)', color: 'var(--paper)', borderRadius: '8px', padding: '11px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
          >
            Done
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="device">
      <div className="screen">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div className="wordmark">CORTEX</div>
          <Link to="/" style={{ fontSize: '11px', color: 'var(--ink-faint)', textDecoration: 'underline' }}>
            Back
          </Link>
        </div>

        <div className="section-label">{quiz?.title || 'Quiz'}</div>
        <div className="mono" style={{ fontSize: '10.5px', color: 'var(--ink-faint)', marginBottom: '14px' }}>
          {questions.length} question(s)
        </div>

        {questions.map((q, i) => (
          <div key={q.id} style={{ background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '13px 14px', marginBottom: '10px' }}>
            <span className="mono" style={{ fontSize: '9.5px', color: 'var(--ink-faint)' }}>Q{i + 1}</span>
            <div style={{ fontSize: '13px', margin: '6px 0 9px', lineHeight: 1.5 }}>{q.question_text}</div>
            <div style={{ display: 'grid', gap: '5px' }}>
              {optionKeys.map((k) => {
                const letter = k.toUpperCase()
                const isSelected = answers[q.id] === letter
                return (
                  <button
                    key={k}
                    onClick={() => selectAnswer(q.id, letter)}
                    style={{
                      textAlign: 'left',
                      fontSize: '12px',
                      padding: '8px 9px',
                      borderRadius: '6px',
                      border: `1px solid ${isSelected ? 'var(--ink)' : 'var(--rule)'}`,
                      background: isSelected ? 'var(--ink)' : 'transparent',
                      color: isSelected ? 'var(--paper)' : 'var(--ink-soft)',
                    }}
                  >
                    <strong style={{ marginRight: '7px' }}>{letter}</strong>
                    {q[`option_${k}`]}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {error && <div style={{ fontSize: '12.5px', color: 'var(--red)', marginBottom: '14px' }}>{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          style={{
            width: '100%',
            background: 'var(--ink)',
            color: 'var(--paper)',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '13px',
            fontWeight: 600,
            opacity: !allAnswered || submitting ? 0.5 : 1,
          }}
        >
          {submitting ? 'Submitting…' : 'Submit answers'}
        </button>
      </div>
    </div>
  )
}
