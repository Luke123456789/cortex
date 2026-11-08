import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAssignments } from '../../hooks/useAssignments'
import { ASSIGNMENT_TYPE_LABELS } from '../../lib/assignments'
import { daysLate, dueLabel, groupWeek, onTimeRate } from '../../lib/week'
import styles from './AssignedStatus.module.css'

const DAY = 24 * 60 * 60 * 1000
const fmtDate = (iso) => new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

function Item({ a, names, children }) {
  const where = [names.subjects.get(a.subject_id), names.topics.get(a.topic_id)].filter(Boolean).join(' · ')
  return (
    <li className={`card ${styles.item}`}>
      <div>
        <div className={styles.itemTitle}>{a.title}</div>
        {where && <div className={styles.where}>{where}</div>}
        <div className="meta">{ASSIGNMENT_TYPE_LABELS[a.type] || a.type} · set {fmtDate(a.assigned_at)}</div>
      </div>
      {children}
    </li>
  )
}

// What's set for the student: overdue, due this week, later, undated, and
// recently completed (on time or late). Same grouping as their Your week.
export default function AssignedStatus({ studentId, studentName, subjects = [], topics = [] }) {
  const { assignments, loading } = useAssignments(studentId)
  // Subject and topic names, so "Quiz 1" says which quiz.
  const names = useMemo(() => ({
    subjects: new Map(subjects.map((s) => [s.id, s.name])),
    topics: new Map(topics.map((t) => [t.id, t.name])),
  }), [subjects, topics])
  const week = useMemo(() => groupWeek(assignments), [assignments])
  const rate = useMemo(() => onTimeRate(assignments), [assignments])
  const weekStart = Date.now() - 6 * DAY
  const completed = assignments.filter((a) => a.status === 'completed').slice(0, 10)
  const { days, earlier: overdue, later, anytime, dueThisWeek, doneThisWeek } = week
  const daysWithWork = days.filter((d) => d.items.length > 0)

  return (
    <section aria-labelledby="set-title">
      <h2 id="set-title" className="section-label">Work set for {studentName}</h2>
      {loading ? <p className="empty">Loading…</p> : (
        <>
          <ul className={styles.tiles}>
            <li className={`card ${styles.tile} ${overdue.length ? styles.overdueTile : ''}`}>
              <span className={styles.tileLabel}>Overdue</span>
              <span className={styles.tileValue}>{overdue.length}</span>
              <span className={styles.tileSub}>still to do</span>
            </li>
            <li className={`card ${styles.tile}`}>
              <span className={styles.tileLabel}>Due next 7 days</span>
              <span className={styles.tileValue}>{dueThisWeek}</span>
              <span className={styles.tileSub}>{later.length} later · {anytime.length} no date</span>
            </li>
            <li className={`card ${styles.tile}`}>
              <span className={styles.tileLabel}>Done this week</span>
              <span className={styles.tileValue}>{doneThisWeek}</span>
              <span className={styles.tileSub}>last 7 days</span>
            </li>
            <li className={`card ${styles.tile}`}>
              <span className={styles.tileLabel}>On time</span>
              <span className={styles.tileValue}>{rate ? `${rate.pct}%` : '–'}</span>
              <span className={styles.tileSub}>{rate ? `${rate.onTime} of ${rate.total}, last 30 days` : 'no dated work done in 30 days'}</span>
            </li>
          </ul>

          <div className={styles.columns}>
            <div>
              <h3 className={`section-label ${styles.groupTitle} ${styles.overdueTitle}`}>Overdue</h3>
              {overdue.length === 0 ? <p className="empty">Nothing overdue.</p> : (
                <ul className={styles.list}>
                  {[...overdue].sort((x, y) => daysLate(y.due_at) - daysLate(x.due_at)).map((a) => (
                    <Item key={a.id} a={a} names={names}>
                      <span className={`${styles.when} ${styles.late}`}>
                        {plural(daysLate(a.due_at), 'day')} late
                        <span className={`meta ${styles.whenSub}`}>was due {fmtDate(dueDateOf(a))}</span>
                      </span>
                    </Item>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className={`section-label ${styles.groupTitle}`}>Due in the next 7 days</h3>
              {daysWithWork.length === 0 ? <p className="empty">Nothing due this week.</p> : daysWithWork.map((d) => (
                <div key={d.key}>
                  <p className={styles.dayLabel}>{d.label} · {d.date.toLocaleDateString([], { day: 'numeric', month: 'short' })}</p>
                  <ul className={styles.list}>
                    {d.items.map((a) => <Item key={a.id} a={a} names={names} />)}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {later.length > 0 && (
            <details className={styles.fold}>
              <summary>{plural(later.length, 'item')} due after this week</summary>
              <ul className={styles.list}>
                {later.map((a) => <Item key={a.id} a={a} names={names}><span className={styles.when}>{dueLabel(a.due_at)}</span></Item>)}
              </ul>
            </details>
          )}
          {anytime.length > 0 && (
            <details className={styles.fold}>
              <summary>{plural(anytime.length, 'item')} with no due date</summary>
              <ul className={styles.list}>{anytime.map((a) => <Item key={a.id} a={a} names={names} />)}</ul>
            </details>
          )}
          {completed.length > 0 && (
            <details className={styles.fold}>
              <summary>Recently completed ({completed.filter((a) => new Date(a.completed_at).getTime() >= weekStart).length} this week)</summary>
              <ul className={styles.list}>
                {completed.map((a) => {
                  const late = a.due_at ? daysLate(a.due_at, new Date(a.completed_at)) : null
                  return (
                    <Item key={a.id} a={a} names={names}>
                      <span className={`${styles.when} ${late > 0 ? styles.late : late != null ? styles.onTime : ''}`}>
                        {late == null ? 'Done' : late > 0 ? `${plural(late, 'day')} late` : 'On time'}
                        <span className={`meta ${styles.whenSub}`}>{fmtDate(a.completed_at)}</span>
                      </span>
                    </Item>
                  )
                })}
              </ul>
            </details>
          )}

          <p className={styles.footer}><Link to="/parent/history" className="link">Full work history</Link> · <Link to="/parent/assign" className="link">Assign or cancel work</Link></p>
        </>
      )}
    </section>
  )
}

function dueDateOf(a) {
  const [y, m, d] = a.due_at.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toISOString()
}
