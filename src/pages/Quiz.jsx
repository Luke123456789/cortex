import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const optionKeys = ['a', 'b', 'c', 'd']

export default function Quiz() {
  const { topicId } = useParams()
  const [topic, setTopic] = useState(null)
  const [subtopics, setSubtopics] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSubtopicId, setActiveSubtopicId] = useState('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: topicRow } = await supabase
        .from('topics')
        .select('id, name')
        .eq('id', topicId)
        .single()
      setTopic(topicRow)

      const { data: subtopicRows } = await supabase
        .from('subtopics')
        .select('id, name, spec_ref, display_order')
        .eq('topic_id', topicId)
        .order('display_order')
      setSubtopics(subtopicRows || [])

      const { data: questionRows } = await supabase
        .from('questions')
        .select('id, subtopic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, question_type, ao_weighting, created_at')
        .eq('topic_id', topicId)
        .eq('active', true)
        .order('created_at')
      setQuestions(questionRows || [])
      setLoading(false)
    }
    load()
  }, [topicId])

  const visibleQuestions = activeSubtopicId === 'all'
    ? questions
    : questions.filter((q) => q.subtopic_id === activeSubtopicId)

  return (
    <div className="device">
      <div className="screen">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div className="wordmark">CORTEX</div>
          <Link to="/" style={{ fontSize: '11px', color: 'var(--ink-faint)', textDecoration: 'underline' }}>
            Back
          </Link>
        </div>

        {loading ? (
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>Loading…</div>
        ) : (
          <>
            <div className="section-label">{topic?.name || 'Question bank'}</div>
            <div className="mono" style={{ fontSize: '10.5px', color: 'var(--ink-faint)', marginBottom: '14px' }}>
              {questions.length} question(s) loaded · review only, not the live quiz
            </div>

            <select
              value={activeSubtopicId}
              onChange={(e) => setActiveSubtopicId(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--card)',
                border: '1px solid var(--rule)',
                borderRadius: '8px',
                padding: '9px 10px',
                fontSize: '12.5px',
                fontFamily: "'Space Grotesk', sans-serif",
                color: 'var(--ink)',
                marginBottom: '16px',
              }}
            >
              <option value="all">All subtopics ({questions.length})</option>
              {subtopics.map((st) => {
                const count = questions.filter((q) => q.subtopic_id === st.id).length
                return (
                  <option key={st.id} value={st.id}>
                    {st.spec_ref} {st.name} ({count})
                  </option>
                )
              })}
            </select>

            {visibleQuestions.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>No questions for this subtopic yet.</div>
            ) : (
              visibleQuestions.map((q, i) => (
                <div
                  key={q.id}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--rule)',
                    borderRadius: 'var(--radius)',
                    padding: '13px 14px',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="mono" style={{ fontSize: '9.5px', color: 'var(--ink-faint)' }}>Q{i + 1}</span>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <span className="mono" style={{ fontSize: '9px', textTransform: 'uppercase', color: q.difficulty === 'higher' ? 'var(--brass)' : 'var(--ink-faint)', border: '1px solid var(--rule)', borderRadius: '10px', padding: '2px 6px' }}>
                        {q.difficulty}
                      </span>
                      <span className="mono" style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--ink-faint)', border: '1px solid var(--rule)', borderRadius: '10px', padding: '2px 6px' }}>
                        {q.question_type}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '13px', marginBottom: '9px', lineHeight: 1.5 }}>{q.question_text}</div>

                  <div style={{ display: 'grid', gap: '5px', marginBottom: '8px' }}>
                    {optionKeys.map((k) => {
                      const isCorrect = q.correct_option.toLowerCase() === k
                      return (
                        <div
                          key={k}
                          style={{
                            fontSize: '12px',
                            padding: '6px 9px',
                            borderRadius: '6px',
                            border: `1px solid ${isCorrect ? 'var(--green)' : 'var(--rule)'}`,
                            background: isCorrect ? 'var(--green-bg)' : 'transparent',
                            color: isCorrect ? 'var(--green)' : 'var(--ink-soft)',
                          }}
                        >
                          <strong style={{ marginRight: '7px' }}>{k.toUpperCase()}</strong>
                          {q[`option_${k}`]}
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--ink-faint)', fontStyle: 'italic', borderTop: '1px solid var(--rule)', paddingTop: '7px' }}>
                    {q.explanation}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
