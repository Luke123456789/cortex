import { getExamCountdown } from '../lib/examDate.js'

export default function ExamCountdown({ detailed = false }) {
  const { daysRemaining, weeks, remainderDays, hasStarted } = getExamCountdown()

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1.5px solid var(--rule-strong)',
        borderRadius: 'var(--radius)',
        padding: '18px',
        marginBottom: '18px',
      }}
    >
      <div className="section-label" style={{ marginBottom: '4px' }}>
        Exams
      </div>
      {hasStarted ? (
        <div className="mono" style={{ fontSize: '15px', fontWeight: 600 }}>
          Exams in progress
        </div>
      ) : detailed ? (
        <div className="mono" style={{ fontSize: '15px', fontWeight: 600 }}>
          Exams start in {weeks} week{weeks === 1 ? '' : 's'}, {remainderDays} day{remainderDays === 1 ? '' : 's'}
        </div>
      ) : (
        <div className="mono" style={{ fontSize: '15px', fontWeight: 600 }}>
          {daysRemaining} day{daysRemaining === 1 ? '' : 's'} until exams
        </div>
      )}
    </div>
  )
}
