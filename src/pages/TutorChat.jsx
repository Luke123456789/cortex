import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { gradeAndClaimReward } from '../lib/gradeAndClaimReward'
import { useAuth } from '../hooks/useAuth.jsx'
import { useQuizCatalog } from '../hooks/useQuizCatalog'
import { useFillViewport } from '../hooks/useFillViewport'
import Modal from '../components/Modal.jsx'
import styles from './TutorChat.module.css'

// The edge functions may return a non-JSON body (e.g. a gateway timeout page),
// so parse defensively and surface the server's own error message if present.
async function readJson(res) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

export default function TutorChat() {
  // The student themselves, or a parent's practice student (see useAuth).
  const { studentId, isPractice } = useAuth()
  const { subjects, loading: catalogLoading } = useQuizCatalog(studentId)
  const [searchParams] = useSearchParams()
  const deepLinkedSubtopicId = searchParams.get('subtopicId')

  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [subtopics, setSubtopics] = useState([])
  const [subtopicId, setSubtopicId] = useState('')
  const [resolvingDeepLink, setResolvingDeepLink] = useState(!!deepLinkedSubtopicId)

  // An assignment ("Start session" from /assignments) links here with
  // ?subtopicId=... — resolve which subject/topic that subtopic belongs to
  // so the pickers below land on it instead of their usual defaults.
  useEffect(() => {
    if (!deepLinkedSubtopicId) return
    let cancelled = false
    async function resolve() {
      const { data: subtopicRow } = await supabase.from('subtopics').select('topic_id').eq('id', deepLinkedSubtopicId).single()
      const topicRowRes = subtopicRow ? await supabase.from('topics').select('subject_id').eq('id', subtopicRow.topic_id).single() : null
      if (cancelled) return
      if (subtopicRow && topicRowRes?.data) {
        setSubjectId(topicRowRes.data.subject_id)
        setTopicId(subtopicRow.topic_id)
      }
      setResolvingDeepLink(false)
    }
    resolve()
    return () => { cancelled = true }
  }, [deepLinkedSubtopicId])

  const [started, setStarted] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [lessonPlan, setLessonPlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [textInput, setTextInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [rewardClaimed, setRewardClaimed] = useState(false)
  const [minutesAwarded, setMinutesAwarded] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState(null)

  const [outlineOpen, setOutlineOpen] = useState(false)

  const scrollRef = useRef(null)
  const chatPageRef = useRef(null)
  useFillViewport(chatPageRef, started && !rewardClaimed)
  const messagesRef = useRef([])
  messagesRef.current = messages
  const finishedRef = useRef(false)

  useEffect(() => {
    if (resolvingDeepLink) return
    if (subjects.length && !subjectId) setSubjectId(subjects[0].id)
  }, [subjects, subjectId, resolvingDeepLink])

  const selectedSubject = subjects.find((s) => s.id === subjectId)
  const topics = selectedSubject?.topics.filter((t) => t.questionCount > 0) || []
  const selectedTopic = topics.find((t) => t.id === topicId)

  useEffect(() => {
    if (resolvingDeepLink) return
    if (topics.length && !topics.some((t) => t.id === topicId)) {
      setTopicId(topics[0].id)
    }
  }, [topics, topicId, resolvingDeepLink])

  useEffect(() => {
    async function loadSubtopics() {
      if (!topicId) return
      const { data } = await supabase
        .from('subtopics')
        .select('id, name, spec_ref, display_order')
        .eq('topic_id', topicId)
        .order('display_order')
      setSubtopics(data || [])
      if (data && data.length) {
        const preferred = deepLinkedSubtopicId && data.some((s) => s.id === deepLinkedSubtopicId) ? deepLinkedSubtopicId : data[0].id
        setSubtopicId(preferred)
      } else {
        // Don't carry over the previous topic's subtopic: that would start a
        // session on the wrong subtopic (or silently fail to start).
        setSubtopicId('')
      }
    }
    loadSubtopics()
  }, [topicId, deepLinkedSubtopicId])

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [messages, thinking])

  const callTutor = useCallback(async (nextMessages) => {
    const topic = topics.find((t) => t.id === topicId)
    const subtopic = subtopics.find((st) => st.id === subtopicId)
    setThinking(true)
    setError(null)

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tutor-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({
          subjectName: selectedSubject?.name,
          topicName: topic?.name,
          subtopicName: subtopic?.name,
          specRef: subtopic?.spec_ref,
          messages: nextMessages,
          lessonPlan,
          sessionId,
          studentId,
        }),
      })
      const data = await readJson(res)
      if (data.error) throw new Error(data.error)
      if (!res.ok || !data.reply) throw new Error('The tutor is unavailable right now. Try again in a moment.')
      const updated = [...nextMessages, { role: 'assistant', content: data.reply }]
      setMessages(updated)

      const studentMessageCount = updated.filter((m) => m.role === 'user').length
      await supabase.from('tutor_sessions').update({ message_count: studentMessageCount }).eq('id', sessionId)
    } catch (err) {
      console.error(err)
      setError(err.message || 'The tutor is unavailable right now. Try again in a moment.')
    } finally {
      setThinking(false)
    }
  }, [topics, subtopics, topicId, subtopicId, selectedSubject, sessionId, lessonPlan, studentId])

  function submitMessage(text) {
    const trimmed = text.trim()
    if (!trimmed || thinking) return
    const nextMessages = [...messagesRef.current, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setTextInput('')
    callTutor(nextMessages)
  }

  function retryLastMessage() {
    if (thinking) return
    callTutor(messagesRef.current)
  }

  function handleInputKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitMessage(textInput)
    }
  }

  async function startSession() {
    const topic = topics.find((t) => t.id === topicId)
    const subtopic = subtopics.find((st) => st.id === subtopicId)
    if (selectedTopic?.locked) return
    if (!topic || !subtopic) {
      console.error('Cannot start session — missing topic/subtopic', { topicId, subtopicId, topics, subtopics })
      setError('Could not start — try re-selecting the subject and topic above.')
      return
    }

    setPlanLoading(true)
    setError(null)

    // Only one unfinished session per student+subtopic is allowed
    // (one_active_session_per_subtopic). A chat that was abandoned without
    // finishing never gets completed_at, so reuse that row — reset to a
    // fresh start — rather than inserting a second one that would 409.
    const { data: openSession, error: lookupError } = await supabase
      .from('tutor_sessions')
      .select('id')
      .eq('student_id', studentId)
      .eq('subtopic_id', subtopicId)
      .is('completed_at', null)
      .maybeSingle()

    const { data: session, error: sessionError } = lookupError
      ? { data: null, error: lookupError }
      : openSession
        ? await supabase
            .from('tutor_sessions')
            .update({ started_at: new Date().toISOString(), message_count: 0, messages: [], lesson_plan: null })
            .eq('id', openSession.id)
            .select('id')
            .single()
        : await supabase
            .from('tutor_sessions')
            .insert({ student_id: studentId, subtopic_id: subtopicId })
            .select('id')
            .single()
    if (sessionError) {
      console.error('Failed to start tutor session', sessionError)
      setError('Could not start the session. Try again.')
      setPlanLoading(false)
      return
    }
    setSessionId(session.id)

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession) {
        throw new Error('No active session — please sign in again')
      }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tutor-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({
          subjectName: selectedSubject?.name,
          topicName: topic.name,
          subtopicName: subtopic.name,
          specRef: subtopic.spec_ref,
          studentId,
        }),
      })
      const data = await readJson(res)
      if (data.error) throw new Error(data.error)
      if (!res.ok || !data.plan) throw new Error('Lesson plan request failed')

      setLessonPlan(data.plan)
      await supabase.from('tutor_sessions').update({ lesson_plan: data.plan }).eq('id', session.id)

      setMessages([{ role: 'assistant', content: data.plan.openingLine }])
      setStarted(true)
    } catch (err) {
      console.error(err)
      setError(`Could not prepare the lesson (${err.message}). Try again in a moment.`)
    } finally {
      setPlanLoading(false)
    }
  }

  async function finishSession() {
    if (finishedRef.current) return
    finishedRef.current = true
    setFinishing(true)
    setError(null)

    const topic = topics.find((t) => t.id === topicId)
    const subtopic = subtopics.find((st) => st.id === subtopicId)

    try {
      const result = await gradeAndClaimReward({
        sessionId,
        messages,
        subjectName: selectedSubject?.name,
        topicName: topic?.name,
        subtopicName: subtopic?.name,
      })

      if (result.claimed) {
        setMinutesAwarded(result.minutesAwarded ?? 0)
        setFeedback(result.feedback ?? '')
        setRewardClaimed(true)
      } else {
        setError(
          result.alreadyClaimed
            ? 'This session was already claimed.'
            : 'This session had no messages to grade.'
        )
        finishedRef.current = false
      }
    } catch (err) {
      console.error('Failed to grade tutor session', err)
      setError('Could not grade your session — try again.')
      finishedRef.current = false
    } finally {
      setFinishing(false)
    }
  }

  if (rewardClaimed) {
    return (
      <div className="page">
        <h1 className="section-label">Session complete</h1>
        <div className={`card card--strong ${styles.done}`} role="status">
          <p className={styles.doneText}>
            {isPractice ? 'Practice session graded (practice sessions earn no minutes).' : `+${minutesAwarded} minutes earned for the chat.`}
          </p>
          {feedback && <p className={styles.feedback}>{feedback}</p>}
        </div>
        <Link to="/" className="btn btn--primary">Back to home</Link>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="page">
        <h1 className="section-label">Ask the tutor</h1>

        {catalogLoading ? (
          <p className="empty">Loading subjects…</p>
        ) : (
          <div className={styles.picker}>
            <div>
              <label className="field-label" htmlFor="tutor-subject">Subject</label>
              <select id="tutor-subject" className="field" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}{s.locked ? ' (locked)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="tutor-topic">Topic</label>
              <select id="tutor-topic" className="field" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.name}{t.locked ? ' (locked)' : ''}</option>)}
              </select>
            </div>

            {selectedTopic?.locked ? (
              <p className={`card ${styles.notice}`}>
                A parent has locked {selectedSubject.locked ? 'this subject' : 'this topic'} until {selectedTopic.lockedUntil.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} — try something else in the meantime.
              </p>
            ) : (
              <>
                {subtopics.length === 0 ? (
                  <p className={styles.notice}>No tutor lessons for this topic yet — pick another topic.</p>
                ) : (
                  <div>
                    <label className="field-label" htmlFor="tutor-subtopic">Lesson</label>
                    <select id="tutor-subtopic" className="field" value={subtopicId} onChange={(e) => setSubtopicId(e.target.value)}>
                      {subtopics.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </select>
                  </div>
                )}

                <button type="button" className="btn btn--primary btn--block" onClick={startSession} disabled={!subtopicId || planLoading}>
                  {planLoading ? 'Preparing your lesson…' : 'Start chat'}
                </button>
              </>
            )}
            {error && <p className="error-text" role="alert">{error}</p>}
          </div>
        )}
      </div>
    )
  }

  const lastMessage = messages[messages.length - 1]
  const canRetry = lastMessage?.role === 'user' && !thinking
  const inputRows = textInput.length > 120 || textInput.includes('\n') ? 5 : 2
  const currentSubtopic = subtopics.find((st) => st.id === subtopicId)
  const finishLabel = finishing ? 'Grading your session…' : 'Finish session'

  const outline = (
    <div className={styles.outline}>
      <div>
        <div className="meta">{selectedSubject?.name}{selectedTopic ? ` · ${selectedTopic.name}` : ''}</div>
        <div className={styles.outlineTitle}>{currentSubtopic?.name}</div>
        {currentSubtopic?.spec_ref && <div className="meta">Spec {currentSubtopic.spec_ref}</div>}
      </div>
      {lessonPlan?.learningOutcomes?.length > 0 && (
        <div>
          <h3 className="section-label">Learning outcomes</h3>
          <ul className={styles.outcomes}>
            {lessonPlan.learningOutcomes.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
      )}
    </div>
  )

  return (
    <div className={styles.chatPage} ref={chatPageRef}>
      <section className={styles.chat} aria-label="Tutor chat">
        <div className={styles.chatBar}>
          <div className={styles.chatTitle}>
            <h1 className="section-label">Ask the tutor</h1>
            <div className={styles.chatSubtitle}>{currentSubtopic?.name}</div>
          </div>
          <div className={styles.chatActions}>
            <button type="button" className={`btn btn--secondary btn--small ${styles.outlineButton}`} onClick={() => setOutlineOpen(true)}>
              Lesson outline
            </button>
            <button type="button" className={`btn btn--secondary btn--small ${styles.barFinish}`} onClick={finishSession} disabled={finishing}>
              {finishing ? 'Grading…' : 'Finish'}
            </button>
          </div>
        </div>

        <div ref={scrollRef} className={styles.messages} role="log" aria-live="polite" aria-label="Messages">
          {messages.map((m, i) => (
            <div key={i} className={`${styles.bubble} ${m.role === 'user' ? styles.user : ''}`}>
              <span className="visually-hidden">{m.role === 'user' ? 'You: ' : 'Tutor: '}</span>
              {m.content}
            </div>
          ))}
          {thinking && <div className={`${styles.bubble} ${styles.typing}`}>Tutor is typing…</div>}
        </div>

        {error && (
          <div className={styles.errorRow}>
            <p className="error-text" role="alert">{error}</p>
            {canRetry && (
              <button type="button" className="btn btn--secondary btn--small" onClick={retryLastMessage}>Retry</button>
            )}
          </div>
        )}

        <div className={styles.composer}>
          <label htmlFor="tutor-input" className="visually-hidden">Message</label>
          <textarea
            id="tutor-input"
            className="field"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type your message…"
            rows={inputRows}
            enterKeyHint="send"
          />
          <button type="button" className="btn btn--primary" onClick={() => submitMessage(textInput)} disabled={thinking || !textInput.trim()}>
            Send
          </button>
        </div>
        <p className={`meta ${styles.composerHint}`}><kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line</p>
      </section>

      <aside className={styles.panel} aria-label="Lesson outline">
        <h2 className="section-label">Lesson outline</h2>
        {outline}
        <button type="button" className={`btn btn--primary btn--block ${styles.panelFinish}`} onClick={finishSession} disabled={finishing}>
          {finishLabel}
        </button>
      </aside>

      {outlineOpen && (
        <Modal labelledBy="outline-title" onClose={() => setOutlineOpen(false)}>
          <h2 id="outline-title" className="section-label">Lesson outline</h2>
          {outline}
          <div className={styles.outlineActions}>
            <button type="button" className="btn btn--secondary btn--block" onClick={() => setOutlineOpen(false)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
