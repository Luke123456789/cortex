// Start of the summer GCSE exam series students are revising for.
export const EXAM_START_DATE = '2027-05-15'

export function getExamCountdown(now = new Date()) {
  const examDay = new Date(`${EXAM_START_DATE}T00:00:00`)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const examDayLocal = new Date(examDay.getFullYear(), examDay.getMonth(), examDay.getDate())

  const daysRemaining = Math.round((examDayLocal - today) / (1000 * 60 * 60 * 24))
  const hasStarted = daysRemaining <= 0

  return {
    daysRemaining,
    weeks: Math.floor(daysRemaining / 7),
    remainderDays: daysRemaining % 7,
    hasStarted,
  }
}
