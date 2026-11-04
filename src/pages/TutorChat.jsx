import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { gradeAndClaimReward } from '../lib/gradeAndClaimReward'
import { useAuth } from '../hooks/useAuth.jsx'
import { useQuizCatalog } from '../hooks/useQuizCatalog'

const selectStyle = {
  width: '100%',
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '13px',
  fontFamily: "'Space Grotesk', sans-serif",
  color: 'var(--ink)',
  marginBottom: '10px',
}

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

  const scrollRef = useRef(null)
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
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
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
      <div className="device">
        <div className="screen">
          <div className="wordmark" style={{ marginBottom: '18px' }}>CORTEX</div>
          <div className="section-label">Session complete</div>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', marginBottom: feedback ? '8px' : 0 }}>
              {isPractice ? 'Practice session graded (practice sessions earn no minutes).' : `+${minutesAwarded} minutes earned for the chat.`}
            </div>
            {feedback && (
              <div style={{ fontSize: '12.5px', color: 'var(--ink-faint)' }}>{feedback}</div>
            )}
          </div>
          <Link
            to="/"
            style={{
              display: 'inline-block', background: 'var(--ink)', color: 'var(--paper)',
              borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
            }}
          >
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="device">
        <div className="screen">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div className="wordmark">CORTEX</div>
            <Link to="/" style={{ fontSize: '11px', color: 'var(--ink-faint)', textDecoration: 'underline' }}>Back</Link>
          </div>

          <div className="section-label">Ask the tutor</div>

          {catalogLoading ? (
            <div style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>Loading subjects…</div>
          ) : (
            <>
              <select style={selectStyle} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}{s.locked ? ' (locked)' : ''}</option>)}
              </select>
              <select style={selectStyle} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.name}{t.locked ? ' (locked)' : ''}</option>)}
              </select>

              {selectedTopic?.locked ? (
                <div style={{ fontSize: '12.5px', color: 'var(--ink-faint)', background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '14px 15px' }}>
                  A parent has locked {selectedSubject.locked ? 'this subject' : 'this topic'} until {selectedTopic.lockedUntil.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} — try something else in the meantime.
                </div>
              ) : (
                <>
                  {subtopics.length === 0 ? (
                    <div style={{ fontSize: '12.5px', color: 'var(--ink-faint)', marginBottom: '8px' }}>
                      No tutor lessons for this topic yet — pick another topic.
                    </div>
                  ) : (
                    <select style={selectStyle} value={subtopicId} onChange={(e) => setSubtopicId(e.target.value)}>
                      {subtopics.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </select>
                  )}

                  <button
                    onClick={startSession}
                    disabled={!subtopicId || planLoading}
                    style={{
                      width: '100%', background: 'var(--ink)', color: 'var(--paper)', border: 'none',
                      borderRadius: '8px', padding: '11px', fontSize: '13px', fontWeight: 600, marginTop: '4px',
                      opacity: planLoading ? 0.6 : 1,
                    }}
                  >
                    {planLoading ? 'Preparing your lesson…' : 'Start chat'}
                  </button>
                </>
              )}
              {error && <div style={{ fontSize: '11.5px', color: 'var(--red)', marginTop: '10px' }}>{error}</div>}
            </>
          )}
        </div>
      </div>
    )
  }

  const lastMessage = messages[messages.length - 1]
  const canRetry = lastMessage?.role === 'user' && !thinking
  const inputRows = textInput.length > 120 || textInput.includes('\n') ? 5 : 2

  return (
    <div className="device">
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div className="wordmark">CORTEX</div>
          <button
            onClick={finishSession}
            disabled={finishing}
            style={{
              background: 'transparent', border: '1px solid var(--rule)', borderRadius: '20px',
              padding: '5px 12px', fontSize: '11px', color: 'var(--ink-faint)',
              opacity: finishing ? 0.6 : 1,
            }}
          >
            {finishing ? 'Grading your session…' : 'Finish'}
          </button>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: m.role === 'user' ? 'var(--ink)' : 'var(--card)',
                color: m.role === 'user' ? 'var(--paper)' : 'var(--ink)',
                border: m.role === 'user' ? 'none' : '1px solid var(--rule)',
                borderRadius: '10px', padding: '9px 12px', fontSize: '13px', lineHeight: 1.45,
              }}
            >
              {m.content}
            </div>
          ))}
          {thinking && (
            <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: 'var(--card)', color: 'var(--ink-faint)', border: '1px solid var(--rule)', borderRadius: '10px', padding: '9px 12px', fontSize: '13px', fontStyle: 'italic' }}>
              Tutor is typing…
            </div>
          )}
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--red)' }}>{error}</div>
            {canRetry && (
              <button
                onClick={retryLastMessage}
                style={{
                  background: 'none', border: '1px solid var(--rule)', borderRadius: '14px',
                  padding: '3px 10px', fontSize: '10.5px', color: 'var(--ink)', flexShrink: 0,
                }}
              >
                Retry
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type your message…"
            rows={inputRows}
            style={{ flex: 1, border: '1px solid var(--rule)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', fontFamily: "'Space Grotesk', sans-serif", resize: 'none', lineHeight: 1.4 }}
          />
          <button
            onClick={() => submitMessage(textInput)}
            disabled={thinking || !textInput.trim()}
            style={{ background: 'var(--ink)', color: 'var(--paper)', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: 600, opacity: thinking || !textInput.trim() ? 0.6 : 1 }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
