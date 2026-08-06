import { useState } from 'react'
import { useTutorSessions } from '../hooks/useTutorSessions'

function formatTime(isoString) {
  return new Date(isoString).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function sessionStatus(session) {
  if (!session.completedAt) return { text: 'In progress', color: 'var(--ink-faint)' }
  if (session.rewardClaimed && session.minutesEarned > 0) {
    return { text: `+${session.minutesEarned} min`, color: 'var(--green)' }
  }
  return { text: 'No reward', color: 'var(--ink-faint)' }
}

export default function TutorSessionHistory() {
  const { sessions, loading } = useTutorSessions()
  const [showAll, setShowAll] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  if (loading) {
    return <div style={{ fontSize: '12px', color: 'var(--ink-faint)', marginBottom: '18px' }}>Loading tutor sessions…</div>
  }

  if (sessions.length === 0) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <div className="section-label">Tutor sessions</div>
        <div style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>No tutor sessions yet.</div>
      </div>
    )
  }

  const visible = showAll ? sessions : sessions.slice(0, 6)

  return (
    <div style={{ marginBottom: '20px' }}>
      <div className="section-label">Tutor sessions</div>
      {visible.map((session) => {
        const status = sessionStatus(session)
        const isExpanded = expandedId === session.id
        const hasTranscript = session.messages.length > 0
        return (
          <div key={session.id} style={{ borderBottom: '1px solid var(--rule)' }}>
            <div
              onClick={() => hasTranscript && setExpandedId(isExpanded ? null : session.id)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                gap: '10px',
                cursor: hasTranscript ? 'pointer' : 'default',
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px' }}>
                  {hasTranscript && (
                    <span style={{ display: 'inline-block', marginRight: '6px', color: 'var(--ink-faint)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                      ›
                    </span>
                  )}
                  {session.subtopicName || 'Unknown topic'}
                </div>
                <span className="mono" style={{ fontSize: '9.5px', color: 'var(--ink-faint)' }}>
                  {[session.subjectName, session.topicName].filter(Boolean).join(' · ')}
                  {' · '}{formatTime(session.startedAt)}
                  {' · '}{session.messageCount} message{session.messageCount === 1 ? '' : 's'}
                </span>
              </div>
              <span
                className="mono"
                style={{ fontSize: '12px', fontWeight: 600, color: status.color, whiteSpace: 'nowrap' }}
              >
                {status.text}
              </span>
            </div>
            {isExpanded && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '4px 0 14px',
                }}
              >
                {session.messages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                    }}
                  >
                    <div className="mono" style={{ fontSize: '9px', color: 'var(--ink-faint)', textAlign: m.role === 'user' ? 'right' : 'left', marginBottom: '2px' }}>
                      {m.role === 'user' ? 'Student' : 'Tutor'}
                    </div>
                    <div
                      style={{
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
      {!showAll && sessions.length > 6 && (
        <button
          onClick={() => setShowAll(true)}
          style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--brass)', textDecoration: 'underline', padding: 0, marginTop: '8px' }}
        >
          View more ({sessions.length - 6} more)
        </button>
      )}
    </div>
  )
}
