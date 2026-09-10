import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useStudentProfile } from '../hooks/useStudentProfile'
import { useAssignableCatalog } from '../hooks/useAssignableCatalog'
import { useAssignments } from '../hooks/useAssignments'

const TYPES = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'tutor_session', label: 'Tutor session' },
  { value: 'written_test', label: 'Written test' },
  { value: 'past_paper', label: 'Past paper' },
]

const selectStyle = {
  width: '100%',
  background: 'var(--paper)',
  border: '1px solid var(--rule)',
  borderRadius: '8px',
  padding: '9px 10px',
  fontSize: '12.5px',
  fontFamily: "'Space Grotesk', sans-serif",
  color: 'var(--ink)',
  marginBottom: '8px',
}

const inputStyle = { ...selectStyle }

function formatTime(isoString) {
  return new Date(isoString).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function truncate(text, max) {
  if (!text) return text
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export default function AssignWork() {
  const { user } = useAuth()
  const { displayName: studentName } = useStudentProfile()
  const { subjects, topics, subtopics, quizzes, examQuestions, loading: catalogLoading } = useAssignableCatalog()
  const { assignments, refresh } = useAssignments()

  const [type, setType] = useState('quiz')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [subtopicId, setSubtopicId] = useState('')
  const [quizId, setQuizId] = useState('')
  const [examQuestionId, setExamQuestionId] = useState('')
  const [pastPaperTitle, setPastPaperTitle] = useState('')
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (subjects.length && !subjectId) setSubjectId(subjects[0].id)
  }, [subjects, subjectId])

  const topicsForSubject = topics.filter((t) => t.subject_id === subjectId)

  useEffect(() => {
    if (topicsForSubject.length && !topicsForSubject.some((t) => t.id === topicId)) {
      setTopicId(topicsForSubject[0].id)
    }
  }, [topicsForSubject, topicId])

  const subtopicsForTopic = subtopics.filter((s) => s.topic_id === topicId)
  const quizzesForTopic = quizzes.filter((q) => q.topic_id === topicId)
  const examQuestionsForTopic = examQuestions.filter((q) => q.topic_id === topicId)

  useEffect(() => {
    setSubtopicId(subtopicsForTopic[0]?.id || '')
    setQuizId(quizzesForTopic[0]?.id || '')
    setExamQuestionId(examQuestionsForTopic[0]?.id || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId])

  function canPush() {
    if (type === 'quiz') return !!quizId
    if (type === 'tutor_session') return !!subtopicId
    if (type === 'written_test') return !!examQuestionId
    if (type === 'past_paper') return pastPaperTitle.trim().length > 0
    return false
  }

  async function handlePush() {
    setBusy(true)
    setError(null)
    try {
      const base = {
        type,
        subject_id: subjectId || null,
        topic_id: topicId || null,
        note: note.trim() || null,
        due_at: dueDate ? new Date(dueDate).toISOString() : null,
        assigned_by: user.id,
      }

      let payload
      if (type === 'quiz') {
        const quiz = quizzes.find((q) => q.id === quizId)
        payload = { ...base, quiz_id: quizId, title: quiz?.title || 'Quiz' }
      } else if (type === 'tutor_session') {
        const subtopic = subtopics.find((s) => s.id === subtopicId)
        payload = { ...base, subtopic_id: subtopicId, title: subtopic ? `${subtopic.name} tutor session` : 'Tutor session' }
      } else if (type === 'written_test') {
        const q = examQuestions.find((eq) => eq.id === examQuestionId)
        payload = { ...base, subtopic_id: q?.subtopic_id || null, exam_question_id: examQuestionId, title: q ? truncate(q.question_text, 60) : 'Written test' }
      } else {
        payload = { ...base, title: pastPaperTitle.trim() }
      }

      const { error: insertError } = await supabase.from('assignments').insert(payload)
      if (insertError) throw insertError

      setNote('')
      setDueDate('')
      setPastPaperTitle('')
      refresh()
    } catch (err) {
      console.error('Failed to push assignment', err)
      setError('Could not push that assignment. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function cancelAssignment(id) {
    const { error: updateError } = await supabase.from('assignments').update({ status: 'cancelled' }).eq('id', id)
    if (updateError) console.error('Failed to cancel assignment', updateError)
    refresh()
  }

  const pending = assignments.filter((a) => a.status === 'pending')
  const completed = assignments.filter((a) => a.status === 'completed').slice(0, 6)

  return (
    <div className="device">
      <div className="screen">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div className="wordmark">CORTEX</div>
          <Link to="/parent" style={{ fontSize: '11px', color: 'var(--ink-faint)', textDecoration: 'underline' }}>
            Back
          </Link>
        </div>

        <div className="section-label">Assign work{studentName ? ` to ${studentName}` : ''}</div>

        {catalogLoading ? (
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>Loading…</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  style={{
                    flex: 1,
                    background: type === t.value ? 'var(--ink)' : 'var(--card)',
                    color: type === t.value ? 'var(--paper)' : 'var(--ink)',
                    border: '1px solid ' + (type === t.value ? 'var(--ink)' : 'var(--rule)'),
                    borderRadius: '20px',
                    padding: '7px 4px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {type === 'past_paper' ? (
              <input
                style={inputStyle}
                placeholder="e.g. AQA Economics Paper 1, June 2019"
                value={pastPaperTitle}
                onChange={(e) => setPastPaperTitle(e.target.value)}
              />
            ) : (
              <>
                <select style={selectStyle} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <select style={selectStyle} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                  {topicsForSubject.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                {type === 'quiz' && (
                  quizzesForTopic.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--ink-faint)', marginBottom: '8px' }}>No quizzes for this topic.</div>
                  ) : (
                    <select style={selectStyle} value={quizId} onChange={(e) => setQuizId(e.target.value)}>
                      {quizzesForTopic.map((q) => (
                        <option key={q.id} value={q.id}>{q.title} ({q.question_count})</option>
                      ))}
                    </select>
                  )
                )}

                {type === 'tutor_session' && (
                  subtopicsForTopic.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--ink-faint)', marginBottom: '8px' }}>No subtopics for this topic.</div>
                  ) : (
                    <select style={selectStyle} value={subtopicId} onChange={(e) => setSubtopicId(e.target.value)}>
                      {subtopicsForTopic.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )
                )}

                {type === 'written_test' && (
                  examQuestionsForTopic.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--ink-faint)', marginBottom: '8px' }}>No written test questions for this topic yet.</div>
                  ) : (
                    <select style={selectStyle} value={examQuestionId} onChange={(e) => setExamQuestionId(e.target.value)}>
                      {examQuestionsForTopic.map((q) => (
                        <option key={q.id} value={q.id}>{q.command_word} · {truncate(q.question_text, 40)} ({q.total_marks} marks)</option>
                      ))}
                    </select>
                  )
                )}
              </>
            )}

            <input
              type="date"
              style={inputStyle}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <textarea
              style={{ ...inputStyle, minHeight: '54px', resize: 'vertical', fontFamily: "'Space Grotesk', sans-serif" }}
              placeholder="Optional note for the student"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <button
              onClick={handlePush}
              disabled={busy || !canPush()}
              style={{
                width: '100%',
                background: 'var(--ink)',
                color: 'var(--paper)',
                border: 'none',
                borderRadius: '8px',
                padding: '11px',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '10px',
                opacity: busy || !canPush() ? 0.5 : 1,
              }}
            >
              {busy ? 'Pushing…' : 'Push to student'}
            </button>

            {error && <div style={{ fontSize: '12.5px', color: 'var(--red)', marginBottom: '14px' }}>{error}</div>}
          </>
        )}

        <div className="section-label" style={{ marginTop: '18px' }}>Pending</div>
        {pending.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)', marginBottom: '20px' }}>Nothing outstanding.</div>
        ) : (
          <div style={{ display: 'grid', gap: '6px', marginBottom: '20px' }}>
            {pending.map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--card)',
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius)',
                  padding: '9px 12px',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px' }}>{a.title}</div>
                  <span className="mono" style={{ fontSize: '9.5px', color: 'var(--ink-faint)' }}>
                    {TYPES.find((t) => t.value === a.type)?.label} · {formatTime(a.assigned_at)}
                    {a.due_at ? ` · due ${new Date(a.due_at).toLocaleDateString([], { day: '2-digit', month: 'short' })}` : ''}
                  </span>
                </div>
                <button
                  onClick={() => cancelAssignment(a.id)}
                  style={{ background: 'transparent', border: '1px solid var(--rule-strong)', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 600, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="section-label">Recently completed</div>
        {completed.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>Nothing completed yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: '6px' }}>
            {completed.map((a) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--rule)' }}>
                <div style={{ fontSize: '13px' }}>{a.title}</div>
                <span className="mono" style={{ fontSize: '9.5px', color: 'var(--green)' }}>{formatTime(a.completed_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
