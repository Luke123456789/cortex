import { useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useAnalytics } from '../hooks/useAnalytics'
import { bucketByDay, dayWindows, subjectQuality, summarize, summaryLines } from '../lib/analytics'
import ComparisonChart from '../components/analytics/ComparisonChart.jsx'
import Sparkline from '../components/analytics/Sparkline.jsx'
import SuggestedAssignments from '../components/analytics/SuggestedAssignments.jsx'
import ProgressReview from '../components/analytics/ProgressReview.jsx'
import styles from './Analytics.module.css'

const PERIODS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

const TREND = {
  improving: { text: 'Improving', icon: '↑', className: styles.improving },
  slipping: { text: 'Slipping', icon: '↓', className: styles.slipping },
  steady: { text: 'Steady', icon: '→', className: styles.steady },
  'not-enough': { text: 'Not enough data', icon: '', className: styles.notEnough },
}

const fmtPct = (v) => (v == null ? '–' : `${v}%`)

function Tile({ label, value, previous, format = (v) => v }) {
  return (
    <li className={`card ${styles.tile}`}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>{value == null ? '–' : format(value)}</span>
      <span className={styles.tileDelta}>prev 7 days: {previous == null ? '–' : format(previous)}</span>
    </li>
  )
}

export default function Analytics() {
  const { childStudent } = useAuth()
  const studentId = childStudent?.id
  const name = childStudent?.displayName || 'your student'
  const { data, loading, error } = useAnalytics(studentId)
  const [days, setDays] = useState(90)

  const now = useMemo(() => new Date(), [data])
  const summary = useMemo(() => (data ? summarize({ ...data, now }) : null), [data, now])
  const windows = useMemo(() => dayWindows(now), [now])
  const questionsByDay = useMemo(
    () => (data ? bucketByDay(data.quizSessions, (q) => q.completed_at, (q) => q.question_count || 0, now) : null),
    [data, now],
  )
  const minutesByDay = useMemo(
    () => (data ? bucketByDay(data.ledger.filter((e) => e.type === 'earn'), (e) => e.created_at, (e) => e.amount_minutes || 0, now) : null),
    [data, now],
  )
  const quality = useMemo(() => {
    if (!data) return []
    const rows = subjectQuality({ ...data, days, now })
    // Active subjects first, then by name.
    return rows.sort((a, b) => Number(b.hasAnyActivity) - Number(a.hasAnyActivity) || a.name.localeCompare(b.name))
  }, [data, days, now])

  return (
    <div className={`page page--wide ${styles.page}`}>
      <h1 className={`section-label ${styles.title}`}>Analytics for {name}</h1>

      {loading && !data ? (
        <p className="empty">Loading…</p>
      ) : error ? (
        <p className="error-text" role="alert">{error}</p>
      ) : summary && (
        <>
          <section aria-labelledby="summary-title">
            <h2 id="summary-title" className="section-label">Last 7 days</h2>
            <div className={styles.lines}>
              {summaryLines(summary, name).map((line) => <p key={line}>{line}</p>)}
            </div>
            <ul className={styles.tiles}>
              <Tile label="Quiz questions" value={summary.current.questions} previous={summary.previous.questions} />
              <Tile label="Quiz accuracy" value={summary.current.accuracy} previous={summary.previous.accuracy} format={fmtPct} />
              <Tile label="Tutor sessions" value={summary.current.tutorSessions} previous={summary.previous.tutorSessions} />
              <Tile label="Minutes earned" value={summary.current.minutesEarned} previous={summary.previous.minutesEarned} />
              <Tile label="Minutes redeemed" value={summary.current.minutesRedeemed} previous={summary.previous.minutesRedeemed} />
              <Tile label="Subjects studied" value={summary.current.subjects.length} previous={summary.previous.subjects.length} />
            </ul>
          </section>

          <section aria-labelledby="activity-title">
            <h2 id="activity-title" className="section-label">Activity: last 7 days vs previous 7</h2>
            <div className={styles.charts}>
              <div className={`card ${styles.chartCard}`}>
                <ComparisonChart id="chart-questions" title="Quiz questions answered" unit="questions" days={windows} {...questionsByDay} />
              </div>
              <div className={`card ${styles.chartCard}`}>
                <ComparisonChart id="chart-minutes" title="Minutes earned" unit="minutes" days={windows} {...minutesByDay} />
              </div>
            </div>
          </section>

          <SuggestedAssignments studentId={studentId} studentName={name} />

          <section aria-labelledby="quality-title">
            <div className={styles.qualityHead}>
              <h2 id="quality-title" className="section-label">Quality by subject</h2>
              <div className="chips" role="group" aria-label="Period">
                {PERIODS.map((p) => (
                  <button key={p.days} type="button" className="chip" aria-pressed={days === p.days} onClick={() => setDays(p.days)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <p className={styles.caveat}>
              Accuracy is from multiple-choice quizzes over the last {days} days, compared with the {days} days before. Higher tier and applied
              show how {name} does on the harder questions. Tutor rating is the AI marker's score for the tutor sessions. None of this is a GCSE
              grade: that needs marked written answers, which aren't built yet.
            </p>
            <table className={styles.quality}>
              <caption className="visually-hidden">Quality by subject, last {days} days</caption>
              <thead>
                <tr>
                  <th scope="col">Subject</th>
                  <th scope="col">Answers</th>
                  <th scope="col">Accuracy</th>
                  <th scope="col">Higher tier</th>
                  <th scope="col">Applied</th>
                  <th scope="col">Tutor rating</th>
                  <th scope="col">Weekly accuracy (12 wks)</th>
                  <th scope="col">Trend</th>
                </tr>
              </thead>
              <tbody>
                {quality.map((q) => {
                  const trend = TREND[q.trend]
                  return (
                    <tr key={q.subjectId} className={q.hasAnyActivity ? '' : styles.inactive}>
                      <th scope="row">
                        <span>{q.name}</span>
                        {q.examBoard && <span className={styles.board}>{q.examBoard}</span>}
                      </th>
                      <td data-label="Answers">
                        {q.current.answers}
                        <span className={styles.sub}>prev {q.previous.answers}</span>
                      </td>
                      <td data-label="Accuracy">
                        {fmtPct(q.current.accuracy)}
                        <span className={styles.sub}>prev {fmtPct(q.previous.accuracy)}</span>
                      </td>
                      <td data-label="Higher tier">
                        {fmtPct(q.higher.accuracy)}
                        <span className={styles.sub}>{q.higher.answers} answers</span>
                      </td>
                      <td data-label="Applied">
                        {fmtPct(q.applied.accuracy)}
                        <span className={styles.sub}>{q.applied.answers} answers</span>
                      </td>
                      <td data-label="Tutor rating">
                        {fmtPct(q.tutor.rating)}
                        <span className={styles.sub}>{q.tutor.sessions} session{q.tutor.sessions === 1 ? '' : 's'}</span>
                      </td>
                      <td data-label="Weekly accuracy" className={styles.spark}>
                        <Sparkline values={q.weekly} />
                        {q.weekly.some((v) => v != null) && (
                          <span className="visually-hidden">
                            Weekly accuracy, oldest first: {q.weekly.map((v) => (v == null ? 'none' : `${v}%`)).join(', ')}
                          </span>
                        )}
                      </td>
                      <td data-label="Trend">
                        <span className={`${styles.status} ${trend.className}`}>
                          {trend.icon && <span aria-hidden="true">{trend.icon}</span>}
                          {q.hasAnyActivity ? trend.text : 'Not started'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        </>
      )}

      <ProgressReview />
    </div>
  )
}
