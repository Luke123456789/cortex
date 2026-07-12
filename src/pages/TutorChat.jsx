import { useState, useEffect, useRef, useCallback } from 'react'
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

const SpeechRecognitionAPI =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
const speechSupported = !!SpeechRecognitionAPI && typeof window !== 'undefined' && 'speechSynthesis' in window

export default function TutorChat() {
  const { user } = useAuth()
  const { subjects, loading: catalogLoading } = useQuizCatalog()

  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [subtopics, setSubtopics] = useState([])
  const [subtopicId, setSubtopicId] = useState('')

  const [started, setStarted] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [lessonPlan, setLessonPlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const [textInput, setTextInput] = useState('')
  const [useTextFallback, setUseTextFallback] = useState(!speechSupported)

  // voiceState: 'idle' | 'listening' | 'thinking' | 'speaking'
  const [voiceState, setVoiceState] = useState('idle')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [rewardClaimed, setRewardClaimed] = useState(false)
  const [error, setError] = useState(null)

  const scrollRef = useRef(null)
  const recognitionRef = useRef(null)
  const messagesRef = useRef([])
  messagesRef.current = messages

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
  }, [messages, liveTranscript])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
    }
  }, [])

  function speak(text) {
    if (!speechSupported) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-GB'
    utterance.rate = 1
    utterance.onstart = () => setVoiceState('speaking')
    utterance.onend = () => setVoiceState('idle')
    utterance.onerror = () => setVoiceState('idle')
    window.speechSynthesis.speak(utterance)
  }

  function playAudioBase64(base64, fallbackText) {
    if (!base64) {
      speak(fallbackText)
      return
    }
    try {
      const audio = new Audio(`data:audio/mpeg;base64,${base64}`)
      audio.onplay = () => setVoiceState('speaking')
      audio.onended = () => setVoiceState('idle')
      audio.onerror = () => {
        console.error('Audio playback failed, falling back to browser voice')
        speak(fallbackText)
      }
      audio.play()
    } catch (err) {
      console.error('Audio playback threw', err)
      speak(fallbackText)
    }
  }

  const callTutor = useCallback(async (nextMessages) => {
    const topic = topics.find((t) => t.id === topicId)
    const subtopic = subtopics.find((st) => st.id === subtopicId)
    setVoiceState('thinking')
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
        }),
      })
      if (!res.ok) throw new Error('Tutor request failed')
      const data = await res.json()
      const updated = [...nextMessages, { role: 'assistant', content: data.reply }]
      setMessages(updated)
      playAudioBase64(data.audioBase64, data.reply)

      const studentMessageCount = updated.filter((m) => m.role === 'user').length
      await supabase.from('tutor_sessions').update({ message_count: studentMessageCount }).eq('id', sessionId)
    } catch (err) {
      console.error(err)
      setError('The tutor is unavailable right now. Try again in a moment.')
      setVoiceState('idle')
    }
  }, [topics, subtopics, topicId, subtopicId, selectedSubject, sessionId, lessonPlan])

  function submitMessage(text) {
    const trimmed = text.trim()
    if (!trimmed) return
    const nextMessages = [...messagesRef.current, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setLiveTranscript('')
    setTextInput('')
    callTutor(nextMessages)
  }

  function startListening() {
    if (!speechSupported || voiceState !== 'idle') return
    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'en-GB'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => {
      setVoiceState('listening')
      setLiveTranscript('')
    }
    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setLiveTranscript(transcript)
    }
    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error)
      setVoiceState('idle')
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access is blocked. Enable it in your browser settings, or use text below.')
        setUseTextFallback(true)
      }
    }
    recognition.onend = () => {
      setVoiceState((current) => {
        if (current === 'listening') {
          setLiveTranscript((finalTranscript) => {
            if (finalTranscript.trim()) submitMessage(finalTranscript)
            return ''
          })
          return 'idle'
        }
        return current
      })
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  function stopListening() {
    recognitionRef.current?.stop()
  }

  async function startSession() {
    const topic = topics.find((t) => t.id === topicId)
    const subtopic = subtopics.find((st) => st.id === subtopicId)
    if (!topic || !subtopic) return

    setPlanLoading(true)
    setError(null)

    const { data: session, error: sessionError } = await supabase
      .from('tutor_sessions')
      .insert({ student_id: user.id, subtopic_id: subtopicId })
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
        }),
      })
      if (!res.ok) throw new Error('Lesson plan request failed')
      const data = await res.json()

      setLessonPlan(data.plan)
      await supabase.from('tutor_sessions').update({ lesson_plan: data.plan }).eq('id', session.id)

      setMessages([{ role: 'assistant', content: data.plan.openingLine }])
      playAudioBase64(data.audioBase64, data.plan.openingLine)
      setStarted(true)
    } catch (err) {
      console.error(err)
      setError('Could not prepare the lesson. Try again in a moment.')
    } finally {
      setPlanLoading(false)
    }
  }

  async function finishSession() {
    recognitionRef.current?.stop()
    window.speechSynthesis?.cancel()

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

          <div className="section-label">Ask the tutor · voice chat</div>

          {!speechSupported && (
            <div style={{ fontSize: '11.5px', color: 'var(--brass)', marginBottom: '12px' }}>
              Voice isn't supported in this browser — you'll type instead. Works best in Chrome.
            </div>
          )}

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
                disabled={!subtopicId || planLoading}
                style={{
                  width: '100%', background: 'var(--ink)', color: 'var(--paper)', border: 'none',
                  borderRadius: '8px', padding: '11px', fontSize: '13px', fontWeight: 600, marginTop: '4px',
                  opacity: planLoading ? 0.6 : 1,
                }}
              >
                {planLoading ? 'Preparing your lesson…' : 'Start chat'}
              </button>
              {error && <div style={{ fontSize: '11.5px', color: 'var(--red)', marginTop: '10px' }}>{error}</div>}
            </>
          )}
        </div>
      </div>
    )
  }

  const stateLabel = { idle: 'Tap to talk', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking…' }[voiceState]

  return (
    <div className="device">
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div className="wordmark">CORTEX</div>
          <button
            onClick={finishSession}
            style={{ background: 'transparent', border: '1px solid var(--rule)', borderRadius: '20px', padding: '5px 12px', fontSize: '11px', color: 'var(--ink-faint)' }}
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
                borderRadius: '10px', padding: '9px 12px', fontSize: '13px', lineHeight: 1.45,
              }}
            >
              {m.content}
            </div>
          ))}
          {liveTranscript && (
            <div style={{ alignSelf: 'flex-end', maxWidth: '85%', background: 'var(--paper-2)', color: 'var(--ink-faint)', border: '1px dashed var(--rule)', borderRadius: '10px', padding: '9px 12px', fontSize: '13px', fontStyle: 'italic' }}>
              {liveTranscript}
            </div>
          )}
        </div>

        {error && <div style={{ fontSize: '11px', color: 'var(--red)', marginBottom: '8px' }}>{error}</div>}

        {!useTextFallback ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', paddingBottom: '4px' }}>
            <button
              onClick={voiceState === 'listening' ? stopListening : startListening}
              disabled={voiceState === 'thinking' || voiceState === 'speaking'}
              style={{
                width: '64px', height: '64px', borderRadius: '50%', border: 'none',
                background: voiceState === 'listening' ? 'var(--red)' : 'var(--ink)',
                color: 'var(--paper)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: voiceState === 'listening' ? '0 0 0 6px var(--red-bg)' : 'none',
                opacity: voiceState === 'thinking' || voiceState === 'speaking' ? 0.5 : 1,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
                <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-faint)' }}>{stateLabel}</div>
            <button
              onClick={() => setUseTextFallback(true)}
              style={{ background: 'none', border: 'none', fontSize: '10.5px', color: 'var(--ink-faint)', textDecoration: 'underline' }}
            >
              Switch to typing
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitMessage(textInput)}
              placeholder="Type your message…"
              disabled={voiceState === 'thinking'}
              style={{ flex: 1, border: '1px solid var(--rule)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', fontFamily: "'Space Grotesk', sans-serif" }}
            />
            <button
              onClick={() => submitMessage(textInput)}
              disabled={voiceState === 'thinking' || !textInput.trim()}
              style={{ background: 'var(--ink)', color: 'var(--paper)', border: 'none', borderRadius: '8px', padding: '0 16px', fontSize: '13px', fontWeight: 600 }}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
