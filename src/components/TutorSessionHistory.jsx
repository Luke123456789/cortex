import { useState } from 'react'
import { useTutorSessions } from '../hooks/useTutorSessions'
import styles from './TutorSessionHistory.module.css'

function formatTime(isoString) {
  return new Date(isoString).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function sessionStatus(session) {
  if (!session.completedAt) return { text: 'In progress', earned: false }
  if (session.rewardClaimed && session.minutesEarned > 0) {
    return { text: `+${session.minutesEarned} min`, earned: true }
  }
  return { text: 'No reward', earned: false }
}

export default function TutorSessionHistory({ studentId }) {
  const { sessions, loading } = useTutorSessions(studentId)
  const [showAll, setShowAll] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  if (loading) {
    return <p className="empty">Loading tutor sessions…</p>
  }

  if (sessions.length === 0) {
    return (
      <section aria-labelledby="sessions-title">
        <h1 id="sessions-title" className="section-label">Tutor sessions</h1>
        <p className="empty">No tutor sessions yet.</p>
      </section>
    )
  }

  const visible = showAll ? sessions : sessions.slice(0, 6)

  return (
    <section aria-labelledby="sessions-title">
      <h1 id="sessions-title" className="section-label">Tutor sessions</h1>
      <div className={styles.head} aria-hidden="true">
        <span>Lesson</span>
        <span>Subject · topic</span>
        <span>Started</span>
        <span>Messages</span>
        <span className={styles.num}>Result</span>
      </div>
      <ul className={styles.list}>
        {visible.map((session) => {
          const status = sessionStatus(session)
          const isExpanded = expandedId === session.id
          const hasTranscript = session.messages.length > 0
          const subjectLine = [session.subjectName, session.topicName].filter(Boolean).join(' · ')
          const messagesLabel = `${session.messageCount} message${session.messageCount === 1 ? '' : 's'}`
          const cells = (
            <>
              <span className={styles.lesson}>
                <span className={styles.chevron} aria-hidden="true">{hasTranscript ? '›' : ''}</span>
                <span>{session.subtopicName || 'Unknown topic'}</span>
              </span>
              <span className={`meta ${styles.metaLine}`}>
                {subjectLine}{' · '}{formatTime(session.startedAt)}{' · '}{messagesLabel}
              </span>
              <span className={styles.subject}>{subjectLine}</span>
              <span className={`meta ${styles.started}`}>{formatTime(session.startedAt)}</span>
              <span className={`meta ${styles.messages}`}>{messagesLabel}</span>
              <span className={`${styles.status} ${status.earned ? styles.earned : ''}`}>{status.text}</span>
            </>
          )
          return (
            <li key={session.id} className={styles.item}>
              {hasTranscript ? (
                <button
                  type="button"
                  className={styles.row}
                  aria-expanded={isExpanded}
                  aria-controls={`transcript-${session.id}`}
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                >
                  {cells}
                </button>
              ) : (
                <div className={styles.row}>{cells}</div>
              )}
              {isExpanded && (
                <div id={`transcript-${session.id}`} className={styles.transcript}>
                  {session.messages.map((m, i) => (
                    <div key={i} className={`${styles.message} ${m.role === 'user' ? styles.fromStudent : ''}`}>
                      <div className={styles.who}>{m.role === 'user' ? 'Student' : 'Tutor'}</div>
                      <div className={styles.bubble}>{m.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {!showAll && sessions.length > 6 && (
        <button type="button" className={`link ${styles.more}`} onClick={() => setShowAll(true)}>
          View more ({sessions.length - 6} more)
        </button>
      )}
    </section>
  )
}
