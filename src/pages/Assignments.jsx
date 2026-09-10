import { Link } from 'react-router-dom'
import { useAssignments } from '../hooks/useAssignments'
import { ASSIGNMENT_TYPE_LABELS, assignmentAction } from '../lib/assignments'

function formatTime(isoString) {
  return new Date(isoString).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function AssignmentCard({ assignment }) {
  const action = assignmentAction(assignment)
  const overdue = assignment.due_at && new Date(assignment.due_at).getTime() < Date.now()

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '13px 14px', marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '4px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600 }}>{assignment.title}</div>
        <span className="mono" style={{ fontSize: '9.5px', textTransform: 'uppercase', color: 'var(--ink-faint)', border: '1px solid var(--rule)', borderRadius: '20px', padding: '2px 8px', whiteSpace: 'nowrap' }}>
          {ASSIGNMENT_TYPE_LABELS[assignment.type] || assignment.type}
        </span>
      </div>
      {assignment.note && (
        <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '6px' }}>{assignment.note}</div>
      )}
      <div className="mono" style={{ fontSize: '9.5px', color: overdue ? 'var(--red)' : 'var(--ink-faint)', marginBottom: action ? '10px' : 0 }}>
        Assigned {formatTime(assignment.assigned_at)}
        {assignment.due_at ? ` · due ${new Date(assignment.due_at).toLocaleDateString([], { day: '2-digit', month: 'short' })}${overdue ? ' (overdue)' : ''}` : ''}
      </div>
      {action ? (
        <Link
          to={action.to}
          style={{ display: 'inline-block', background: 'var(--ink)', color: 'var(--paper)', borderRadius: '8px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 600, textDecoration: 'none' }}
        >
          {action.label}
        </Link>
      ) : (
        <span className="mono" style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-faint)', border: '1px solid var(--rule)', borderRadius: '20px', padding: '4px 9px' }}>
          Coming soon
        </span>
      )}
    </div>
  )
}

export default function Assignments() {
  const { assignments, loading } = useAssignments()

  const pending = assignments.filter((a) => a.status === 'pending')
  const completed = assignments.filter((a) => a.status === 'completed').slice(0, 10)

  return (
    <div className="device">
      <div className="screen">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div className="wordmark">CORTEX</div>
          <Link to="/" style={{ fontSize: '11px', color: 'var(--ink-faint)', textDecoration: 'underline' }}>
            Back
          </Link>
        </div>

        <div className="section-label">Assigned work</div>

        {loading ? (
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>Loading…</div>
        ) : pending.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)', marginBottom: '20px' }}>Nothing assigned right now.</div>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            {pending.map((a) => <AssignmentCard key={a.id} assignment={a} />)}
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
