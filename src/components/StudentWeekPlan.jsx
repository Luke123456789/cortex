import { useMemo } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useWeeklyPlan } from '../hooks/useWeeklyPlan'
import { mondayOf, planShareText } from '../lib/weeklyPlan'
import WeeklyPlanProgress from './WeeklyPlanProgress'
import ShareButton from './ShareButton'

// The student's targets for this week, set by a parent, with progress.
// Renders nothing when no plan is set.
export default function StudentWeekPlan({ studentId }) {
  const { profile } = useAuth()
  const weekStart = mondayOf()
  const { loading, plan, subjects, progress } = useWeeklyPlan(studentId, weekStart)
  const subjectNames = useMemo(
    () => (plan?.subject_ids ?? []).map((id) => {
      const s = subjects.find((x) => x.id === id)
      return s ? { name: s.name, covered: progress?.subjects.has(id) } : null
    }).filter(Boolean),
    [plan, subjects, progress],
  )
  if (loading || !plan) return null
  const name = profile?.role === 'student' ? profile.display_name : null
  return (
    <section className="card card--strong stack" aria-labelledby="plan-title" style={{ marginBottom: 'var(--space-4, 16px)' }}>
      <h2 id="plan-title" className="section-label">This week's targets</h2>
      <WeeklyPlanProgress plan={plan} progress={progress} subjects={subjects} />
      <ShareButton label="Share my progress on WhatsApp" className="btn btn--secondary btn--small"
        getText={() => planShareText({ plan, name, subjectNames, progress, weekStart })} />
    </section>
  )
}
