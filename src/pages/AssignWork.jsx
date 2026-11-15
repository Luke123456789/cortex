import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useAssignableCatalog } from '../hooks/useAssignableCatalog'
import { useAssignments } from '../hooks/useAssignments'
import { useDoneBefore } from '../hooks/useDoneBefore'
import { useStudyPacks } from '../hooks/useStudyPacks'
import { buildPackSteps, groupSteps, packProgress, PACK_STEP_LABELS } from '../lib/studyPacks'
import { doneSentence } from '../lib/doneBefore'
import styles from './AssignWork.module.css'

const TYPES = [
  { value: 'study_pack', label: 'Study pack' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'tutor_session', label: 'Tutor session' },
  { value: 'written_test', label: 'Written test' },
  { value: 'mock_paper', label: 'Mock paper' },
  // 'past_paper' is hidden until there's a way to do one (it was only a typed
  // title the student couldn't open). Its handling below is kept for then.
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
  const { packs, refresh: refreshPacks } = useStudyPacks(studentId, assignments)
  const DONE_MARK = ' ✓ done'

  const [type, setType] = useState('study_pack')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [subtopicId, setSubtopicId] = useState('')
  const [quizId, setQuizId] = useState('')
  const [examQuestionId, setExamQuestionId] = useState('')
  const [paperRef, setPaperRef] = useState('')
  const [pastPaperTitle, setPastPaperTitle] = useState('')
  // Study pack steps the parent has unticked (by step key).
  const [excluded, setExcluded] = useState(() => new Set())
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // Confirmation after a successful push; cleared as soon as the form changes.
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    setSuccess(null)
  }, [studentId, type, topicId, subtopicId, quizId, examQuestionId, paperRef, excluded])

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
  // Mock papers are picked from one list of every paper, grouped by subject.
  const subjectName = (id) => subjects.find((x) => x.id === id)?.name || 'Other'
  const papersBySubject = [...new Set(papers.map((p) => subjectName(p.subject_id)))].sort()
    .map((name) => ({ name, papers: papers.filter((p) => subjectName(p.subject_id) === name) }))
  const selectedPaper = papers.find((p) => p.ref === paperRef)

  useEffect(() => {
    if (!papers.some((p) => p.ref === paperRef)) setPaperRef(papers[0]?.ref || '')
  }, [papers, paperRef])

  useEffect(() => {
    setSubtopicId(subtopicsForTopic[0]?.id || '')
    setQuizId(quizzesForTopic[0]?.id || '')
    setExamQuestionId(examQuestionsForTopic[0]?.id || '')
    setExcluded(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId])

  // Study pack for the picked topic.
  const topic = topics.find((x) => x.id === topicId)
  const packSteps = type === 'study_pack' ? buildPackSteps(topic, { subtopics, quizzes, examQuestions, papers }, done, assignments) : []
  const chosenSteps = packSteps.filter((s) => s.available && !excluded.has(s.key))
  const availableSteps = packSteps.filter((s) => s.available)
  const pendingPacks = packs.filter((p) => p.status === 'pending')
  const packsAhead = pendingPacks.filter((p) => p.subject_id === subjectId)
  const samePackPending = packsAhead.some((p) => p.topic_id === topicId)
  function toggleStep(key) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function canPush() {
    if (!studentId) return false
    if (type === 'study_pack') return chosenSteps.length > 0
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

      if (type === 'study_pack') {
        const { error: rpcError } = await supabase.rpc('create_study_pack', {
          p_student: studentId,
          p_subject: subjectId || null,
          p_topic: topicId || null,
          p_title: topic?.name || 'Study pack',
          p_note: note.trim() || null,
          p_due: base.due_at,
          p_items: chosenSteps.map((s) => s.item),
        })
        if (rpcError) throw rpcError
        setNote('')
        setDueDate('')
        setExcluded(new Set())
        setSuccess(`Assigned the “${topic?.name}” study pack (${chosenSteps.length} steps) to ${target?.isPractice ? 'the practice student' : studentName || 'the student'}.`)
        refresh()
        refreshPacks()
        return
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
        payload = { ...base, subject_id: paper?.subject_id || null, topic_id: null, paper_ref: paperRef, title: paper?.title || 'Mock paper' }
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

  // Cancel the pack first, so cancelling its steps doesn't mark it completed.
  async function cancelPack(id) {
    if (!window.confirm('Cancel this study pack and every step not done yet?')) return
    const { error: packError } = await supabase.from('study_packs').update({ status: 'cancelled' }).eq('id', id)
    if (packError) console.error('Failed to cancel study pack', packError)
    else {
      const { error: stepsError } = await supabase.from('assignments').update({ status: 'cancelled' }).eq('pack_id', id).eq('status', 'pending')
      if (stepsError) console.error('Failed to cancel study pack steps', stepsError)
    }
    refresh()
    refreshPacks()
  }

  async function cancelAssignment(id) {
    const { error: updateError } = await supabase.from('assignments').update({ status: 'cancelled' }).eq('id', id)
    if (updateError) console.error('Failed to cancel assignment', updateError)
    refresh()
  }

  const pending = assignments.filter((a) => a.status === 'pending')
  // Pack steps are listed under their pack, not one by one.
  const loosePending = pending.filter((a) => !a.pack_id)
  // The item currently picked in the form is already waiting for this student.
  const alreadyPending = type !== 'study_pack' && pending.some((a) => a.type === type && (
    (type === 'quiz' && a.quiz_id === quizId) ||
    (type === 'written_test' && a.exam_question_id === examQuestionId) ||
    (type === 'tutor_session' && a.subtopic_id === subtopicId) ||
    (type === 'past_paper' && a.title === pastPaperTitle.trim()) ||
    (type === 'mock_paper' && a.paper_ref === paperRef)
  ))
  const completed = assignments.filter((a) => a.status === 'completed').slice(0, 6)
  // The picked item has been finished before (assigned or self-started).
  const doneEntry = !done || type === 'study_pack' ? null
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
                  papers.length === 0 ? (
                    <p className={styles.notice}>No mock papers yet.</p>
                  ) : (
                    <div>
                      <label className="field-label" htmlFor="assign-mock">Paper</label>
                      <select id="assign-mock" className="field" value={paperRef} onChange={(e) => setPaperRef(e.target.value)}>
                        {papersBySubject.map((g) => (
                          <optgroup key={g.name} label={g.name}>
                            {g.papers.map((p) => <option key={p.ref} value={p.ref}>{p.title}</option>)}
                          </optgroup>
                        ))}
                      </select>
                      {selectedPaper && (
                        <p className={styles.preview}>
                          {subjectName(selectedPaper.subject_id)} · {selectedPaper.total_marks} marks · {selectedPaper.duration_minutes} minutes · {selectedPaper.calculator ? 'calculator allowed' : 'no calculator'}. Worked through question by question in one sitting; each answer is AI-marked.
                        </p>
                      )}
                    </div>
                  )
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

                    {type === 'study_pack' && (
                      <div className={styles.pack}>
                        <p className={styles.preview}>
                          Each lesson in order: tutor session, then quiz, then a written question, with an exam practice set at the end. Untick anything you don’t want. Packs are done one at a time for each subject.
                        </p>
                        {groupSteps(packSteps).map((g) => (
                          <fieldset key={g.name} className={styles.packGroup}>
                            <legend className={styles.packLesson}>{g.name}</legend>
                            {g.steps.map((s) => (
                              <label key={s.key} className={styles.packStep} data-unavailable={!s.available || undefined}>
                                <input
                                  type="checkbox"
                                  checked={s.available && !excluded.has(s.key)}
                                  disabled={!s.available}
                                  onChange={() => toggleStep(s.key)}
                                />
                                <span className={styles.packStepText}>
                                  <span className={styles.packStepName}>{PACK_STEP_LABELS[s.type]}</span>
                                  <span className="meta">{s.detail}</span>
                                  {s.done && <span className={styles.flagDone}>Done before</span>}
                                  {s.pending && <span className={styles.flagPending}>Already set</span>}
                                </span>
                              </label>
                            ))}
                          </fieldset>
                        ))}
                        <p className={styles.packCount}>
                          {chosenSteps.length} of {availableSteps.length} steps
                          {packsAhead.length > 0 ? ` · comes after ${packsAhead.length} ${subjectName(subjectId)} pack${packsAhead.length === 1 ? '' : 's'} already set` : ''}
                        </p>
                        {samePackPending && !success && (
                          <p className={styles.duplicate}>There’s already a {topic?.name} pack waiting. Assigning this will set a second one.</p>
                        )}
                      </div>
                    )}

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
                  {busy ? 'Pushing…' : type === 'study_pack' ? `Assign pack (${chosenSteps.length} steps)` : alreadyPending && !success ? 'Push again' : 'Push to student'}
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
                {pendingPacks.map((p) => {
                  const progress = packProgress(assignments.filter((a) => a.pack_id === p.id))
                  return (
                    <li key={p.id} className={`card ${styles.pendingItem}`}>
                      <div>
                        <div className={styles.pendingTitle}>{p.title} study pack</div>
                        <span className="meta">
                          {subjectName(p.subject_id)} · {progress.done} of {progress.total} done · {formatTime(p.assigned_at)}
                          {p.due_at ? ` · due ${new Date(p.due_at).toLocaleDateString([], { day: '2-digit', month: 'short' })}` : ''}
                        </span>
                      </div>
                      <button type="button" className="btn btn--secondary btn--small" onClick={() => cancelPack(p.id)}>
                        Cancel
                      </button>
                    </li>
                  )
                })}
                {loosePending.map((a) => (
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
