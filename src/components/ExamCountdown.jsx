import { getExamCountdown } from '../lib/examDate.js'
import styles from './ExamCountdown.module.css'

export default function ExamCountdown({ detailed = false, className = '' }) {
  const { daysRemaining, weeks, remainderDays, hasStarted } = getExamCountdown()

  return (
    <div className={`card card--strong ${styles.root} ${className}`}>
      <div className={`section-label ${styles.label}`}>Exams</div>
      <div className={styles.value}>
        {hasStarted
          ? 'Exams in progress'
          : detailed
            ? `Exams start in ${weeks} week${weeks === 1 ? '' : 's'}, ${remainderDays} day${remainderDays === 1 ? '' : 's'}`
            : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} until exams`}
      </div>
    </div>
  )
}
