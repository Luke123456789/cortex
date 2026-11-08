import { useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useWorkHistory } from '../hooks/useWorkHistory'
import { STATES, filterRows, historyRows, summarizeHistory, toCsv } from '../lib/history'
import styles from './WorkHistory.module.css'

const GROUPS = [
  { key: 'all', label: 'All' },
  { key: 'done', label: 'Done' },
  { key: 'not_done', label: 'Not done' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'late', label: 'Done late' },
  { key: 'cancelled', label: 'Cancelled' },
]

const fmtDay = (key) => {
  if (!key) return '–'
  const [y, m, d] = key.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString([], { day: 'numeric', month: 'short', year: '2-digit' })
}
const fmtWhen = (iso) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export default function WorkHistory() {
  const { childStudent, linkedStudents } = useAuth()
  const [targetId, setTargetId] = useState('')
  const studentId = targetId || childStudent?.id
  const target = linkedStudents.find((s) => s.id === studentId)
  const name = target ? (target.isPractice ? 'the practice student' : target.displayName) : 'your student'
  const { data, loading, error } = useWorkHistory(studentId)

  const [group, setGroup] = useState('all')
  const [subject, setSubject] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const rows = useMemo(() => (data ? historyRows(data.assignments, data.results, data.names) : []), [data])
  const summary = useMemo(() => summarizeHistory(rows), [rows])
  const shown = useMemo(() => filterRows(rows, { group, subject, from, to }), [rows, group, subject, from, to])
  const subjects = useMemo(() => [...new Set(rows.map((r) => r.subject).filter(Boolean))].sort(), [rows])
  const filtered = group !== 'all' || subject || from || to

  return (
    <div className="page page--wide">
      <h1 className="section-label">Work history for {name}</h1>

      {linkedStudents.length > 1 && (
        <div className={styles.student}>
          <label className="field-label" htmlFor="history-student">Student</label>
          <select id="history-student" className="field" value={studentId || ''} onChange={(e) => setTargetId(e.target.value)}>
            {linkedStudents.map((s) => <option key={s.id} value={s.id}>{s.isPractice ? 'Practice student' : s.displayName}</option>)}
          </select>
        </div>
      )}

      {loading && !data ? <p className="empty">Loading…</p> : error ? <p className="error-text" role="alert">{error}</p> : (
        <>
          <ul className={styles.tiles}>
            <li className={`card ${styles.tile}`}>
              <span className={styles.tileLabel}>Set</span>
              <span className={styles.tileValue}>{summary.set}</span>
              <span className={styles.tileSub}>{summary.cancelled} cancelled</span>
            </li>
            <li className={`card ${styles.tile}`}>
              <span className={styles.tileLabel}>Done</span>
              <span className={styles.tileValue}>{summary.done}</span>
              <span className={styles.tileSub}>{summary.onTime} on time · {summary.late} late</span>
            </li>
            <li className={`card ${styles.tile} ${summary.overdue ? styles.overdueTile : ''}`}>
              <span className={styles.tileLabel}>Not done</span>
              <span className={styles.tileValue}>{summary.overdue + summary.pending}</span>
              <span className={styles.tileSub}>{summary.overdue} overdue · {summary.pending} not due yet</span>
            </li>
            <li className={`card ${styles.tile}`}>
              <span className={styles.tileLabel}>On time</span>
              <span className={styles.tileValue}>{summary.onTimePct == null ? '–' : `${summary.onTimePct}%`}</span>
              <span className={styles.tileSub}>of dated work done</span>
            </li>
          </ul>

          <div className={styles.filters}>
            <div className="chips" role="group" aria-label="Show">
              {GROUPS.map((g) => (
                <button key={g.key} type="button" className="chip" aria-pressed={group === g.key} onClick={() => setGroup(g.key)}>{g.label}</button>
              ))}
            </div>
            <div className={styles.filterFields}>
              <div>
                <label className="field-label" htmlFor="history-subject">Subject</label>
                <select id="history-subject" className="field" value={subject} onChange={(e) => setSubject(e.target.value)}>
                  <option value="">All subjects</option>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="history-from">Set from</label>
                <input id="history-from" type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="field-label" htmlFor="history-to">Set to</label>
                <input id="history-to" type="date" className="field" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            <div className={styles.actions}>
              <span className="meta">{filtered ? `${shown.length} of ${plural(rows.length, 'item')}` : plural(rows.length, 'item')}</span>
              <button type="button" className="btn btn--secondary btn--small" disabled={!shown.length}
                onClick={() => download(`work-history-${(target?.displayName || 'student').toLowerCase().replace(/\W+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(shown))}>
                Download CSV
              </button>
            </div>
          </div>

          {shown.length === 0 ? <p className="empty">{rows.length ? 'Nothing matches these filters.' : 'No work has been set yet.'}</p> : (
            <div className={styles.scroller}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Work</th>
                    <th scope="col">Set</th>
                    <th scope="col">Due</th>
                    <th scope="col">Status</th>
                    <th scope="col">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id}>
                      <td className={styles.work}>
                        <div className={styles.title}>{r.title}</div>
                        <div className="meta">{[r.type, r.subject, r.topic].filter(Boolean).join(' · ')}</div>
                        {r.note && <div className={styles.note}>Note: {r.note}</div>}
                      </td>
                      <td className={`meta ${styles.set}`}><span className={styles.cellLabel}>Set </span>{fmtWhen(r.setAt)}</td>
                      <td className={`meta ${styles.due}`}><span className={styles.cellLabel}>Due </span>{fmtDay(r.due)}</td>
                      <td className={styles.status}>
                        <span className={`${styles.badge} ${styles[r.state]}`}>{STATES[r.state].label}</span>
                        {(r.daysLate || r.completedAt) && (
                          <span className={`meta ${styles.statusSub}`}>
                            {r.completedAt ? `Completed ${fmtWhen(r.completedAt)}` : ''}
                            {r.daysLate && r.completedAt ? ' · ' : ''}
                            {r.daysLate ? `${plural(r.daysLate, 'day')} late` : ''}
                          </span>
                        )}
                      </td>
                      <td className={styles.result}>{r.result?.text || <span className="meta">–</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={`meta ${styles.footnote}`}>Cancelled work is recorded, but not when it was cancelled.</p>
        </>
      )}
    </div>
  )
}
