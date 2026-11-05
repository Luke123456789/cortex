import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAssignments } from '../hooks/useAssignments'
import { useAuth } from '../hooks/useAuth.jsx'
import { ASSIGNMENT_TYPE_LABELS, assignmentAction } from '../lib/assignments'
import { dueLabel, groupWeek } from '../lib/week'
import styles from './Assignments.module.css'

function formatTime(isoString) {
  return new Date(isoString).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function Item({ assignment, showDue = false }) {
  const action = assignmentAction(assignment)
  return (
    <li className={`card ${styles.item}`}>
      <div className={styles.itemText}>
        <div className={styles.itemTitle}>{assignment.title}</div>
        <div className="meta">
          {ASSIGNMENT_TYPE_LABELS[assignment.type] || assignment.type}
          {showDue && assignment.due_at ? ` · ${dueLabel(assignment.due_at)}` : ''}
        </div>
        {assignment.note && <p className={styles.itemNote}>{assignment.note}</p>}
      </div>
      <div className={styles.itemAction}>
        {action ? (
          <Link to={action.to} className="btn btn--primary btn--small">{action.label}</Link>
        ) : (
          <span className="tag">Coming soon</span>
        )}
      </div>
    </li>
  )
}

// "Your week": what's due on each of the next 7 days, with anything from
// earlier, later or undated tucked into small sections so a big batch of
// assigned work doesn't land as one long list.
export default function Assignments() {
  const { studentId } = useAuth()
  const { assignments, loading } = useAssignments(studentId)
  const week = useMemo(() => groupWeek(assignments), [assignments])
  const completed = assignments.filter((a) => a.status === 'completed').slice(0, 10)

  const { days, earlier, later, anytime, dueThisWeek, doneThisWeek } = week
  const daysWithWork = days.filter((d) => d.items.length > 0)
  const total = dueThisWeek + doneThisWeek

  // Phone/tablet show one day at a time (desktop shows the whole week): the
  // picked day, else today if anything is due, else the next day with work.
  const [picked, setPicked] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const defaultKey = days[0].items.length ? days[0].key : daysWithWork[0]?.key ?? days[0].key
  const selectedKey = picked ?? defaultKey
  const selectedDay = days.find((d) => d.key === selectedKey)

  function pickDay(key) {
    setPicked(key)
    setShowAll(false)
    // Desktop shows every day, so bring the picked one into view instead.
    if (window.matchMedia('(min-width: 1024px)').matches) {
      document.getElementById(`day-${key}`)?.scrollIntoView({ block: 'start' })
    }
  }

  return (
    <div className="page page--wide">
      <div className={styles.head}>
        <h1 className="section-label">Your week</h1>
        {!loading && (
          <>
            <p className={styles.headline}>
              {dueThisWeek === 0
                ? 'Nothing due this week'
                : `${dueThisWeek} thing${dueThisWeek === 1 ? '' : 's'} due this week`}
              {doneThisWeek > 0 ? ` · ${doneThisWeek} done` : ''}
            </p>
            {total > 0 && (
              <div className={styles.progress} role="img" aria-label={`${doneThisWeek} of ${total} done this week`}>
                <div className={styles.progressFill} style={{ width: `${(doneThisWeek / total) * 100}%` }} />
              </div>
            )}
          </>
        )}
      </div>

      {loading ? (
        <p className="empty">Loading…</p>
      ) : (
        <>
          <nav aria-label="This week">
            <ol className={styles.strip}>
              {days.map((d) => {
                const count = d.items.length
                const cls = `${styles.stripDay} ${count ? '' : styles.stripEmpty} ${d.isToday ? styles.stripToday : ''}`
                return (
                  <li key={d.key}>
                    <button
                      type="button"
                      className={`${cls} ${d.key === selectedKey ? styles.stripSelected : ''}`}
                      aria-pressed={d.key === selectedKey}
                      aria-current={d.isToday ? 'date' : undefined}
                      onClick={() => pickDay(d.key)}
                    >
                      <span className={styles.stripName}>{d.isToday ? 'Today' : d.short}</span>
                      <span className={styles.stripDate}>{d.dayOfMonth}</span>
                      <span className={styles.dots} aria-hidden="true">
                        {Array.from({ length: Math.min(count, 3) }, (_, i) => <span key={i} className={styles.dot} />)}
                        {count > 3 && <span className={styles.more}>+{count - 3}</span>}
                      </span>
                      <span className="visually-hidden">{`${d.label}: ${count ? `${count} due` : 'nothing due'}`}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>

          {earlier.length > 0 && (
            <section className={styles.earlier} aria-labelledby="week-earlier">
              <h2 id="week-earlier" className="section-label">From earlier</h2>
              <p className={styles.earlierNote}>These were due before today. Fit them in when you can.</p>
              <ul className={styles.list}>
                {earlier.map((a) => <Item key={a.id} assignment={a} showDue />)}
              </ul>
            </section>
          )}

          {daysWithWork.length === 0 ? (
            <p className={`${styles.clear} empty`}>
              {later.length + anytime.length > 0 ? 'Nothing due in the next 7 days.' : 'Nothing assigned right now.'}
            </p>
          ) : (
            <>
              {/* Phone/tablet: the picked day only (unless "Show all days"). */}
              {!showAll && selectedDay && selectedDay.items.length === 0 && (
                <p className={`${styles.clear} ${styles.smallOnly} empty`}>Nothing due {selectedDay.isToday ? 'today' : `on ${selectedDay.label}`}.</p>
              )}
              <div className={styles.daysGrid} data-show-all={showAll || undefined}>
                {daysWithWork.map((d) => (
                  <section
                    key={d.key}
                    id={`day-${d.key}`}
                    className={styles.day}
                    data-selected={d.key === selectedKey || undefined}
                    aria-labelledby={`day-${d.key}-title`}
                  >
                    <h2 id={`day-${d.key}-title`} className={styles.dayTitle}>
                      <span className={styles.dayName}>{d.label}</span>
                      <span className="meta">{d.date.toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>
                    </h2>
                    <ul className={styles.list}>
                      {d.items.map((a) => <Item key={a.id} assignment={a} />)}
                    </ul>
                  </section>
                ))}
              </div>
              {daysWithWork.length > 1 && (
                <button type="button" className={`link ${styles.smallOnly} ${styles.showAll}`} onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                  {showAll ? 'Show one day at a time' : 'Show all days'}
                </button>
              )}
            </>
          )}

          <div>
            {anytime.length > 0 && (
              <details className={styles.fold}>
                <summary>{anytime.length} with no due date</summary>
                <ul className={styles.list}>{anytime.map((a) => <Item key={a.id} assignment={a} />)}</ul>
              </details>
            )}
            {later.length > 0 && (
              <details className={styles.fold}>
                <summary>{later.length} due after this week</summary>
                <ul className={styles.list}>{later.map((a) => <Item key={a.id} assignment={a} showDue />)}</ul>
              </details>
            )}
            {completed.length > 0 && (
              <details className={styles.fold}>
                <summary>Recently completed</summary>
                <ul className={styles.list}>
                  {completed.map((a) => (
                    <li key={a.id} className={styles.doneRow}>
                      <span>{a.title}</span>
                      <span className="meta">{formatTime(a.completed_at)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </>
      )}
    </div>
  )
}
