import { targetRows } from '../lib/weeklyPlan'
import styles from './WeeklyPlanProgress.module.css'

// Targets with progress bars, focus subjects and the parent's note. Shared by
// the parent's plan page and the student's week.
export default function WeeklyPlanProgress({ plan, progress, subjects }) {
  if (!plan) return null
  const rows = targetRows(plan, progress, subjects)
  const focusIds = Object.keys(plan.subject_minutes ?? {}).length ? Object.keys(plan.subject_minutes) : (plan.subject_ids ?? [])
  const focus = focusIds.map((id) => subjects.find((s) => s.id === id)).filter(Boolean)
  return (
    <div className={styles.wrap}>
      {rows.length > 0 && (
        <ul className={styles.rows}>
          {rows.map((r) => (
            <li key={r.key} className={styles.row}>
              <div className={styles.rowHead}>
                <span>{r.label}</span>
                <span className={r.met ? styles.met : 'meta'}>{r.doneText} / {r.targetText}{r.met ? ' ✓' : ''}</span>
              </div>
              <div className={styles.bar} role="img" aria-label={`${r.label}: ${r.doneText} of ${r.targetText}`}>
                <div className={`${styles.fill} ${r.met ? styles.fillMet : ''}`} style={{ width: `${Math.min(100, (r.done / r.target) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {focus.length > 0 && (
        <div className={styles.focus}>
          <span className="meta">Focus subjects</span>
          <div className="chips">
            {focus.map((s) => (
              <span key={s.id} className={`chip ${progress.subjects.has(s.id) ? styles.covered : ''}`}>
                {progress.subjects.has(s.id) ? '✓ ' : ''}{s.name}
              </span>
            ))}
          </div>
        </div>
      )}
      <p className="meta">Worked on {progress.daysActive} of 7 days{progress.examPct != null ? ` · exam questions averaging ${progress.examPct}%` : ''}</p>
      {plan.note && <p className={styles.note}>{plan.note}</p>}
    </div>
  )
}
