import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useQuizCatalog } from '../hooks/useQuizCatalog'

const MINUTES_REWARD = 8
const MIN_STUDENT_MESSAGES_FOR_REWARD = 3

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

export default function TutorChat() {
  const { user } = useAuth()
  const { subjects, loading: catalogLoading } = useQuizCatalog()

  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [subtopics, setSubtopics] = useState([])
  const [subtopicId, setSubtopicId] = useState('')

  const [started, setStarted] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [rewardClaimed, setRewardClaimed] = useState(false)
  const [error, setError] = useState(null)

  const scrollRef = useRef(null)

  useEffect(() => {
    if (subjects.length && !subjectId) setSubjectId(subjects[0].id)
  }, [subjects, subjectId])

  const selectedSubject = subjects.find((s) => s.id === subjectId)
  const topics = selectedSubject?.topics.filter((t) => t.questionCount > 0) || []

  useEffect(() => {
    if (topics.length && !topics.some((t) => t.id === topicId)) {
      setTopicId(topics[0].id)
    }
  }, [topics, topicId])

  useEffect(() => {
    async function loadSubtopics() {
      if (!topicId) return
      const { data } = await supabase
        .from('subtopics')
        .select('id, name, spec_ref, display_order')
        .eq('topic_id', topicId)
        .order('display_order')
      setSubtopics(data || [])
      if (data && data.length) setSubtopicId(data[0].id)
    }
    loadSubtopics()
  }, [topicId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function startSession() {
    const topic = topics.find((t) => t.id === topicId)
    const subtopic = subtopics.find((st) => st.id === subtopicId)
    if (!topic || !subtopic) return

    const { data: session, error: sessionError } = await supabase
      .from('tutor_sessions')
      .insert({ student_id: user.id, subtopic_id: subtopicId })
      .select('id')
      .single()
    if (sessionError) {
      console.error('Failed to start tutor session', sessionError)
      setError('Could not start the session. Try again.')
      return
    }

    setSessionId(session.id)
    setStarted(true)
    setError(null)

    const greeting = {
      role: 'assistant',
      content: `Hey! Let's talk through "${subtopic.name}". What do you already know about it, or where do you want to start?`,
    }
    setMessages([greeting])
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return

    const topic = topics.find((t) => t.id === topicId)
    const subtopic = subtopics.find((st) => st.id === subtopicId)
    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setSending(true)
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
          messages: newMessages,
        }),
      })

      if (!res.ok) throw new Error('Tutor request failed')
      const data = await res.json()
      const updated = [...newMessages, { role: 'assistant', content: data.reply }]
      setMessages(updated)

      const studentMessageCount = updated.filter((m) => m.role === 'user').length
      await supabase
        .from('tutor_sessions')
        .update({ message_count: studentMessageCount })
        .eq('id', sessionId)
    } catch (err) {
      console.error(err)
      setError('The tutor is unavailable right now. Try again in a moment.')
    } finally {
      setSending(false)
    }
  }

  async function finishSession() {
    const studentMessageCount = messages.filter((m) => m.role === 'user').length
    const earned = studentMessageCount >= MIN_STUDENT_MESSAGES_FOR_REWARD

    await supabase
      .from('tutor_sessions')
      .update({
        completed_at: new Date().toISOString(),
        reward_claimed: earned,
        minutes_earned: earned ? MINUTES_REWARD : 0,
      })
      .eq('id', sessionId)

    if (earned) {
      await supabase.from('ledger_entries').insert({
        type: 'earn',
        amount_minutes: MINUTES_REWARD,
        source: 'Ask the tutor',
      })
      setRewardClaimed(true)
    } else {
      setRewardClaimed(false)
      setError(`Chat a bit more first — ${MIN_STUDENT_MESSAGES_FOR_REWARD}+ messages needed to earn minutes.`)
    }
  }

  if (rewardClaimed) {
    return (
      <div className="device">
        <div className="screen">
          <div className="wordmark" style={{ marginBottom: '18px' }}>CORTEX</div>
          <div className="section-label">Session complete</div>
          <div style={{ fontSize: '15px', marginBottom: '20px' }}>
            +{MINUTES_REWARD} minutes earned for the chat.
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
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select style={selectStyle} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select style={selectStyle} value={subtopicId} onChange={(e) => setSubtopicId(e.target.value)}>
                {subtopics.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
              </select>

              <button
                onClick={startSession}
                disabled={!subtopicId}
                style={{
                  width: '100%',
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '11px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginTop: '4px',
                }}
              >
                Start chat
              </button>
              {error && <div style={{ fontSize: '11.5px', color: 'var(--red)', marginTop: '10px' }}>{error}</div>}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="device">
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div className="wordmark">CORTEX</div>
          <button
            onClick={finishSession}
            style={{
              background: 'transparent',
              border: '1px solid var(--rule)',
              borderRadius: '20px',
              padding: '5px 12px',
              fontSize: '11px',
              color: 'var(--ink-faint)',
            }}
          >
            Finish
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
                borderRadius: '10px',
                padding: '9px 12px',
                fontSize: '13px',
                lineHeight: 1.45,
              }}
            >
              {m.content}
            </div>
          ))}
          {sending && (
            <div style={{ alignSelf: 'flex-start', fontSize: '11.5px', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
              typing…
            </div>
          )}
        </div>

        {error && <div style={{ fontSize: '11px', color: 'var(--red)', marginBottom: '8px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message…"
            disabled={sending}
            style={{
              flex: 1,
              border: '1px solid var(--rule)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '13px',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            style={{
              background: 'var(--ink)',
              color: 'var(--paper)',
              border: 'none',
              borderRadius: '8px',
              padding: '0 16px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
