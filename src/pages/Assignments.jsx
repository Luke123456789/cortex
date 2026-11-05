import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAssignments } from '../hooks/useAssignments'
import { useAuth } from '../hooks/useAuth.jsx'
import { ASSIGNMENT_TYPE_LABELS, assignmentAction } from '../lib/assignments'
import styles from './Assignments.module.css'

function formatTime(isoString) {
  return new Date(isoString).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function AssignmentCard({ assignment }) {
  const action = assignmentAction(assignment)
  const overdue = assignment.due_at && new Date(assignment.due_at).getTime() < Date.now()

  return (
    <article className={`card ${styles.card}`}>
      <div className={styles.cardTop}>
        <h3 className={styles.cardTitle}>{assignment.title}</h3>
        <span className="tag">{ASSIGNMENT_TYPE_LABELS[assignment.type] || assignment.type}</span>
      </div>
      {assignment.note && <p className={styles.note}>{assignment.note}</p>}
      <div className={`meta ${overdue ? styles.overdue : ''}`}>
        Assigned {formatTime(assignment.assigned_at)}
        {assignment.due_at ? ` · due ${new Date(assignment.due_at).toLocaleDateString([], { day: '2-digit', month: 'short' })}${overdue ? ' (overdue)' : ''}` : ''}
      </div>
      <div className={styles.action}>
        {action ? (
          <Link to={action.to} className="btn btn--primary btn--small">{action.label}</Link>
        ) : (
          <span className="tag">Coming soon</span>
        )}
      </div>
    </article>
  )
}

export default function Assignments() {
  const { studentId } = useAuth()
  const { assignments, loading } = useAssignments(studentId)
  const [typeFilter, setTypeFilter] = useState('all')

  // Filter by type: assignments don't carry their subject (see the stage (b)
  // notes), so type is what can be filtered on without a new query.
  const types = [...new Set(assignments.map((a) => a.type))]
  const matches = (a) => typeFilter === 'all' || a.type === typeFilter
  const pending = assignments.filter((a) => a.status === 'pending').filter(matches)
  const completed = assignments.filter((a) => a.status === 'completed').slice(0, 10).filter(matches)

  return (
    <div className="page page--wide">
      <div className={styles.header}>
        <h1 className={`section-label ${styles.title}`}>Assigned work</h1>
      </div>

      {types.length > 1 && (
        <div className={`chips ${styles.filters}`} role="group" aria-label="Filter by type">
          <button type="button" className="chip" aria-pressed={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>All</button>
          {types.map((t) => (
            <button key={t} type="button" className="chip" aria-pressed={typeFilter === t} onClick={() => setTypeFilter(t)}>
              {ASSIGNMENT_TYPE_LABELS[t] || t}
            </button>
          ))}
        </div>
      )}

      <section className={styles.section} aria-label="Pending">
        {loading ? (
          <p className="empty">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="empty">Nothing assigned right now.</p>
        ) : (
          <ul className={styles.grid}>
            {pending.map((a) => <li key={a.id}><AssignmentCard assignment={a} /></li>)}
          </ul>
        )}
      </section>

      <section aria-labelledby="assignments-done">
        <h2 id="assignments-done" className="section-label">Recently completed</h2>
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
  )
}
