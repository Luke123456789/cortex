// Groups a student's assignments into "Your week": what's due on each of the
// next 7 days, anything left from earlier, what's due later, and work with no
// due date. Pure; tested in test/week.test.js.

const DAY = 24 * 60 * 60 * 1000

// due_at is stored as midnight UTC of the chosen date (Assign work does
// new Date('YYYY-MM-DD').toISOString()), so the date part of the string is
// the day the parent picked, whatever the viewer's time zone.
export function dueDayKey(dueAt) {
  return dueAt ? dueAt.slice(0, 10) : null
}

function localKey(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function weekDays(now = new Date()) {
  const today = startOfDay(now)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today.getTime() + i * DAY + 2 * 60 * 60 * 1000) // +2h guards DST
    date.setHours(0, 0, 0, 0)
    return {
      key: localKey(date),
      date,
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString([], { weekday: 'long' }),
      short: date.toLocaleDateString([], { weekday: 'short' }),
      dayOfMonth: date.getDate(),
      isToday: i === 0,
    }
  })
}

const byDueThenAssigned = (a, b) =>
  (dueDayKey(a.due_at) || '').localeCompare(dueDayKey(b.due_at) || '') ||
  new Date(a.assigned_at) - new Date(b.assigned_at)

export function groupWeek(assignments, now = new Date()) {
  const days = weekDays(now).map((d) => ({ ...d, items: [] }))
  const first = days[0].key
  const last = days[6].key
  const pending = assignments.filter((a) => a.status === 'pending').sort(byDueThenAssigned)

  const earlier = []
  const later = []
  const anytime = []
  for (const a of pending) {
    const key = dueDayKey(a.due_at)
    if (!key) anytime.push(a)
    else if (key < first) earlier.push(a)
    else if (key > last) later.push(a)
    else days.find((d) => d.key === key).items.push(a)
  }

  // Done this week: completed in the last 7 days (today included).
  const weekStart = startOfDay(now).getTime() - 6 * DAY
  const doneThisWeek = assignments.filter((a) => a.status === 'completed' && a.completed_at && new Date(a.completed_at).getTime() >= weekStart).length
  const dueThisWeek = days.reduce((n, d) => n + d.items.length, 0)

  return { days, earlier, later, anytime, dueThisWeek, doneThisWeek }
}

// The next few things to do, for Home: earlier first, then by due date, then
// undated work, then later.
export function upNext(assignments, count = 3, now = new Date()) {
  const { days, earlier, later, anytime } = groupWeek(assignments, now)
  return [...earlier, ...days.flatMap((d) => d.items), ...anytime, ...later].slice(0, count)
}

export function dueLabel(dueAt, now = new Date()) {
  const key = dueDayKey(dueAt)
  if (!key) return null
  const days = weekDays(now)
  const day = days.find((d) => d.key === key)
  if (day) return day.isToday ? 'Due today' : day.label === 'Tomorrow' ? 'Due tomorrow' : `Due ${day.label}`
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `Due ${date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}`
}

// Whole days between the due date and `on` (default today): positive = late.
// null when there's no due date.
export function daysLate(dueAt, on = new Date()) {
  const key = dueDayKey(dueAt)
  if (!key) return null
  const [y, m, d] = key.split('-').map(Number)
  const due = new Date(y, m - 1, d)
  const when = startOfDay(on)
  return Math.round((when - due) / DAY)
}

// Completed work in the last `days` days that had a due date: how many were
// done on or before it.
export function onTimeRate(assignments, days = 30, now = new Date()) {
  const since = startOfDay(now).getTime() - (days - 1) * DAY
  const dated = assignments.filter((a) => a.status === 'completed' && a.completed_at && a.due_at && new Date(a.completed_at).getTime() >= since)
  if (!dated.length) return null
  const onTime = dated.filter((a) => daysLate(a.due_at, new Date(a.completed_at)) <= 0).length
  return { onTime, total: dated.length, pct: Math.round((onTime / dated.length) * 100) }
}
