import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useAssignableCatalog } from '../hooks/useAssignableCatalog'
import { useAssignments } from '../hooks/useAssignments'
import { useDoneBefore } from '../hooks/useDoneBefore'
import { doneSentence } from '../lib/doneBefore'
import styles from './AssignWork.module.css'

const TYPES = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'tutor_session', label: 'Tutor session' },
  { value: 'written_test', label: 'Written test' },
  { value: 'mock_paper', label: 'Mock paper' },
  { value: 'past_paper', label: 'Past paper' },
]

function formatTime(isoString) {
  return new Date(isoString).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// "Stem cells: written answer (6 marks)". The question text itself often
// starts with an extract, so it makes a poor title.
function writtenTitle(question, subtopics) {
  const lesson = subtopics.find((s) => s.id === question.subtopic_id)?.name
  return `${lesson || 'Written answer'}: written answer (${question.total_marks} marks)`
}

function truncate(text, max) {
  if (!text) return text
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export default function AssignWork() {
  const { user, childStudent, linkedStudents } = useAuth()
  // Defaults to the practice student, so work is tried out from the student
  // view first; the real student is picked deliberately. Falls back to the
  // real student if there's no practice student.
  const [targetId, setTargetId] = useState('')
  const practiceStudent = linkedStudents.find((s) => s.isPractice)
  const studentId = targetId || practiceStudent?.id || childStudent?.id
  const target = linkedStudents.find((s) => s.id === studentId)
  const studentName = target ? (target.isPractice ? 'practice student' : target.displayName) : null
  const { subjects, topics, subtopics, quizzes, examQuestions, papers, loading: catalogLoading } = useAssignableCatalog()
  const { assignments, refresh } = useAssignments(studentId)
  const done = useDoneBefore(studentId)
  const DONE_MARK = ' ✓ done'

  const [type, setType] = useState('quiz')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [subtopicId, setSubtopicId] = useState('')
  const [quizId, setQuizId] = useState('')
  const [examQuestionId, setExamQuestionId] = useState('')
  const [paperRef, setPaperRef] = useState('')
  const [pastPaperTitle, setPastPaperTitle] = useState('')
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // Confirmation after a successful push; cleared as soon as the form changes.
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    setSuccess(null)
  }, [studentId, type, topicId, subtopicId, quizId, examQuestionId, paperRef])

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
  const papersForSubject = papers.filter((p) => p.subject_id === subjectId)

  useEffect(() => {
    if (!papersForSubject.some((p) => p.ref === paperRef)) setPaperRef(papersForSubject[0]?.ref || '')
  }, [papersForSubject, paperRef])

  useEffect(() => {
    setSubtopicId(subtopicsForTopic[0]?.id || '')
    setQuizId(quizzesForTopic[0]?.id || '')
    setExamQuestionId(examQuestionsForTopic[0]?.id || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId])

  function canPush() {
    if (!studentId) return false
    if (type === 'quiz') return !!quizId
    if (type === 'tutor_session') return !!subtopicId
    if (type === 'written_test') return !!examQuestionId
    if (type === 'past_paper') return pastPaperTitle.trim().length > 0
    if (type === 'mock_paper') return !!paperRef
    return false
  }

  async function handlePush() {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const base = {
        student_id: studentId,
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
        payload = { ...base, subtopic_id: q?.subtopic_id || null, exam_question_id: examQuestionId, title: q ? writtenTitle(q, subtopics) : 'Written test' }
      } else if (type === 'mock_paper') {
        const paper = papers.find((p) => p.ref === paperRef)
        payload = { ...base, topic_id: null, paper_ref: paperRef, title: paper?.title || 'Mock paper' }
      } else {
        payload = { ...base, title: pastPaperTitle.trim() }
      }

      const { error: insertError } = await supabase.from('assignments').insert(payload)
      if (insertError) throw insertError

      setNote('')
      setDueDate('')
      setPastPaperTitle('')
      setSuccess(`Assigned “${payload.title}” to ${target?.isPractice ? 'the practice student' : studentName || 'the student'}.`)
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
  // The item currently picked in the form is already waiting for this student.
  const alreadyPending = pending.some((a) => a.type === type && (
    (type === 'quiz' && a.quiz_id === quizId) ||
    (type === 'written_test' && a.exam_question_id === examQuestionId) ||
    (type === 'tutor_session' && a.subtopic_id === subtopicId) ||
    (type === 'past_paper' && a.title === pastPaperTitle.trim()) ||
    (type === 'mock_paper' && a.paper_ref === paperRef)
  ))
  const completed = assignments.filter((a) => a.status === 'completed').slice(0, 6)
  // The picked item has been finished before (assigned or self-started).
  const doneEntry = !done ? null
    : type === 'quiz' ? done.quiz.get(quizId)
    : type === 'written_test' ? done.written.get(examQuestionId)
    : type === 'tutor_session' ? done.tutor.get(subtopicId)
    : (() => {
        const title = pastPaperTitle.trim()
        const doneOnes = type === 'mock_paper'
          ? assignments.filter((a) => a.type === 'mock_paper' && a.status === 'completed' && a.paper_ref === paperRef)
          : title ? assignments.filter((a) => a.type === 'past_paper' && a.status === 'completed' && a.title === title) : []
        return doneOnes.length ? { count: doneOnes.length, lastAt: doneOnes[0].completed_at, lastResult: null } : null
      })()
  const who = target?.isPractice ? 'The practice student' : studentName || 'They'

  return (
    <div className="page page--wide">
      <h1 className="section-label">Assign work{studentName ? ` to ${studentName}` : ''}</h1>

      <div className={styles.layout}>
        <section className={styles.formPanel} aria-label="New assignment">
          <div className={styles.form}>
            {linkedStudents.length > 1 && (
              <div>
                <label className="field-label" htmlFor="assign-student">Student</label>
                <select id="assign-student" className="field" value={studentId || ''} onChange={(e) => setTargetId(e.target.value)}>
                  {linkedStudents.map((s) => (
                    <option key={s.id} value={s.id}>{s.isPractice ? 'Practice student (for trying things out)' : s.displayName}</option>
                  ))}
                </select>
              </div>
            )}

            {catalogLoading ? (
              <p className="empty">Loading…</p>
            ) : (
              <>
                <div className={styles.types} role="group" aria-label="Type of work">
                  {TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className={styles.type}
                      aria-pressed={type === t.value}
                      onClick={() => setType(t.value)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {type === 'past_paper' ? (
                  <div>
                    <label className="field-label" htmlFor="assign-paper">Past paper</label>
                    <input
                      id="assign-paper"
                      className="field"
                      placeholder="e.g. AQA Economics Paper 1, June 2019"
                      value={pastPaperTitle}
                      onChange={(e) => setPastPaperTitle(e.target.value)}
                    />
                  </div>
                ) : type === 'mock_paper' ? (
                  <>
                    <div>
                      <label className="field-label" htmlFor="assign-paper-subject">Subject</label>
                      <select id="assign-paper-subject" className="field" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    {papersForSubject.length === 0 ? (
                      <p className={styles.notice}>No mock papers for this subject yet.</p>
                    ) : (
                      <div>
                        <label className="field-label" htmlFor="assign-mock">Paper</label>
                        <select id="assign-mock" className="field" value={paperRef} onChange={(e) => setPaperRef(e.target.value)}>
                          {papersForSubject.map((p) => (
                            <option key={p.ref} value={p.ref}>{p.title}</option>
                          ))}
                        </select>
                        {papersForSubject.find((p) => p.ref === paperRef) && (() => {
                          const p = papersForSubject.find((x) => x.ref === paperRef)
                          return <p className={styles.preview}>{p.total_marks} marks · {p.duration_minutes} minutes · {p.calculator ? 'calculator allowed' : 'no calculator'}. Worked through question by question in one sitting; each answer is AI-marked.</p>
                        })()}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className={styles.twoUp}>
                      <div>
                        <label className="field-label" htmlFor="assign-subject">Subject</label>
                        <select id="assign-subject" className="field" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="field-label" htmlFor="assign-topic">Topic</label>
                        <select id="assign-topic" className="field" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                          {topicsForSubject.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {type === 'quiz' && (
                      quizzesForTopic.length === 0 ? (
                        <p className={styles.notice}>No quizzes for this topic.</p>
                      ) : (
                        <div>
                          <label className="field-label" htmlFor="assign-quiz">Quiz</label>
                          <select id="assign-quiz" className="field" value={quizId} onChange={(e) => setQuizId(e.target.value)}>
                            {quizzesForTopic.map((q) => (
                              <option key={q.id} value={q.id}>{q.title} ({q.question_count}){done?.quiz.has(q.id) ? DONE_MARK : ''}</option>
                            ))}
                          </select>
                        </div>
                      )
                    )}

                    {type === 'tutor_session' && (
                      subtopicsForTopic.length === 0 ? (
                        <p className={styles.notice}>No subtopics for this topic.</p>
                      ) : (
                        <div>
                          <label className="field-label" htmlFor="assign-subtopic">Lesson</label>
                          <select id="assign-subtopic" className="field" value={subtopicId} onChange={(e) => setSubtopicId(e.target.value)}>
                            {subtopicsForTopic.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}{done?.tutor.has(s.id) ? DONE_MARK : ''}</option>
                            ))}
                          </select>
                        </div>
                      )
                    )}

                    {type === 'written_test' && (
                      examQuestionsForTopic.length === 0 ? (
                        <p className={styles.notice}>No written test questions for this topic yet.</p>
                      ) : (
                        <div>
                          <label className="field-label" htmlFor="assign-question">Question</label>
                          <select id="assign-question" className="field" value={examQuestionId} onChange={(e) => setExamQuestionId(e.target.value)}>
                            {examQuestionsForTopic.map((q) => (
                              <option key={q.id} value={q.id}>{subtopics.find((s) => s.id === q.subtopic_id)?.name || truncate(q.question_text, 40)} · {q.command_word} ({q.total_marks} marks){done?.written.has(q.id) ? DONE_MARK : ''}</option>
                            ))}
                          </select>
                          {examQuestionsForTopic.find((q) => q.id === examQuestionId) && (
                            <p className={styles.preview}>{examQuestionsForTopic.find((q) => q.id === examQuestionId).question_text}</p>
                          )}
                        </div>
                      )
                    )}
                  </>
                )}

                <div>
                  <label className="field-label" htmlFor="assign-due">Due date (optional)</label>
                  <input id="assign-due" type="date" className="field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div>
                  <label className="field-label" htmlFor="assign-note">Note (optional)</label>
                  <textarea
                    id="assign-note"
                    className={`field ${styles.note}`}
                    placeholder="Optional note for the student"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                {doneEntry && !success && (
                  <p className={styles.doneBefore} role="status">{doneSentence(doneEntry, who)}</p>
                )}

                {alreadyPending && !success && (
                  <p className={styles.duplicate}>This is already in {target?.isPractice ? 'the practice student' : studentName || 'the student'}’s pending work. Pushing it again will set it twice.</p>
                )}

                <button type="button" className="btn btn--primary btn--block" onClick={handlePush} disabled={busy || !canPush()}>
                  {busy ? 'Pushing…' : alreadyPending && !success ? 'Push again' : 'Push to student'}
                </button>

                {error && <p className="error-text" role="alert">{error}</p>}
                {success && <p className={styles.success} role="status">{success}</p>}
              </>
            )}
          </div>
        </section>

        <div className={styles.lists}>
          <section aria-labelledby="assign-pending">
            <h2 id="assign-pending" className="section-label">Pending</h2>
            {pending.length === 0 ? (
              <p className="empty">Nothing outstanding.</p>
            ) : (
              <ul className={styles.pending}>
                {pending.map((a) => (
                  <li key={a.id} className={`card ${styles.pendingItem}`}>
                    <div>
                      <div className={styles.pendingTitle}>{a.title}</div>
                      <span className="meta">
                        {TYPES.find((t) => t.value === a.type)?.label} · {formatTime(a.assigned_at)}
                        {a.due_at ? ` · due ${new Date(a.due_at).toLocaleDateString([], { day: '2-digit', month: 'short' })}` : ''}
                      </span>
                    </div>
                    <button type="button" className="btn btn--secondary btn--small" onClick={() => cancelAssignment(a.id)}>
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="assign-done">
            <h2 id="assign-done" className="section-label">Recently completed</h2>
            {completed.length === 0 ? (
              <p className="empty">Nothing completed yet.</p>
            ) : (
              <ul className={styles.done}>
                {completed.map((a) => (
                  <li key={a.id} className={styles.doneRow}>
                    <span>{a.title}</span>
                    <span className="meta">{formatTime(a.completed_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
