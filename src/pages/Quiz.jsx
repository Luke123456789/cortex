import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Quiz() {
  const { topicId } = useParams()
  const [topic, setTopic] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: topicRow } = await supabase
        .from('topics')
        .select('id, name')
        .eq('id', topicId)
        .single()
      setTopic(topicRow)

      const { data: questionRows } = await supabase
        .from('questions')
        .select('id, question_text, difficulty, question_type')
        .eq('topic_id', topicId)
        .eq('active', true)
        .limit(5)
      setQuestions(questionRows || [])
      setLoading(false)
    }
    load()
  }, [topicId])

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
            <div className="section-label">{topic?.name || 'Quiz'}</div>
            <div style={{ fontSize: '12px', color: 'var(--ink-faint)', marginBottom: '18px' }}>
              Quiz engine not built yet — this confirms {questions.length} question(s) load correctly for this topic.
            </div>

            {questions.map((q, i) => (
              <div
                key={q.id}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius)',
                  padding: '12px 14px',
                  marginBottom: '10px',
                  fontSize: '12.5px',
                }}
              >
                <div className="mono" style={{ fontSize: '9.5px', color: 'var(--ink-faint)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Q{i + 1} · {q.difficulty} · {q.question_type}
                </div>
                {q.question_text}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
