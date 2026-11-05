import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useSubjectWallpaper } from '../components/shell/Wallpaper.jsx'
import card from '../components/QuestionCard.module.css'
import styles from './Quiz.module.css'

const optionKeys = ['a', 'b', 'c', 'd']

export default function Quiz() {
  const { topicId } = useParams()
  const [topic, setTopic] = useState(null)
  const [subtopics, setSubtopics] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSubtopicId, setActiveSubtopicId] = useState('all')
  useSubjectWallpaper(topic?.subjects?.name)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: topicRow } = await supabase
        .from('topics')
        .select('id, name, subjects (name)')
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
    <div className="page">
      <Link to="/" className="back-link">← Back</Link>

      {loading ? (
        <p className="empty">Loading…</p>
      ) : (
        <>
          <h1 className="section-label">{topic?.name || 'Question bank'}</h1>
          <p className={`meta ${styles.count}`}>
            {questions.length} question(s) loaded · review only, not the live quiz
          </p>

          <label htmlFor="quiz-subtopic" className="visually-hidden">Subtopic</label>
          <select
            id="quiz-subtopic"
            className={`field ${styles.filter}`}
            value={activeSubtopicId}
            onChange={(e) => setActiveSubtopicId(e.target.value)}
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
            <p className="empty">No questions for this subtopic yet.</p>
          ) : (
            <ol className={styles.list}>
              {visibleQuestions.map((q, i) => (
                <li key={q.id} className={`card ${card.card}`}>
                  <div className={card.top}>
                    <span className="meta">Q{i + 1}</span>
                    <div className={card.tags}>
                      <span className={`tag ${q.difficulty === 'higher' ? card.higher : ''}`}>{q.difficulty}</span>
                      <span className="tag">{q.question_type}</span>
                    </div>
                  </div>

                  <p className={card.text}>{q.question_text}</p>

                  <ul className={card.options}>
                    {optionKeys.map((k) => {
                      const isCorrect = q.correct_option.toLowerCase() === k
                      return (
                        <li key={k} className={`${card.option} ${isCorrect ? card.correct : ''}`}>
                          <span className={card.letter}>{k.toUpperCase()}</span>
                          <span>{q[`option_${k}`]}</span>
                        </li>
                      )
                    })}
                  </ul>

                  <p className={card.explanation}>{q.explanation}</p>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  )
}
