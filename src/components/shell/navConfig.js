// Navigation for the two modes of the app shell. `short` is the label used in
// the phone tab bar; `match` lists extra path prefixes that count as "this
// section" for active highlighting (e.g. playing a quiz is under Quizzes).
export const STUDENT_NAV = [
  { to: '/', label: 'Home', short: 'Home', icon: 'home', end: true },
  { to: '/quizzes', label: 'Quizzes', short: 'Quizzes', icon: 'quiz', match: ['/quiz/', '/play/'] },
  { to: '/tutor', label: 'Ask the tutor', short: 'Tutor', icon: 'tutor' },
  { to: '/assignments', label: 'Assignments', short: 'Assigned', icon: 'assignments' },
  { to: '/activity', label: 'Activity', short: 'Activity', icon: 'activity' },
]

// Room for Goals later: add entries here.
export const PARENT_NAV = [
  { to: '/parent', label: 'Overview', short: 'Overview', icon: 'overview', end: true },
  { to: '/parent/assign', label: 'Assign work', short: 'Assign', icon: 'assign' },
  { to: '/parent/locks', label: 'Subject locks', short: 'Locks', icon: 'lock' },
  { to: '/parent/redemptions', label: 'Redemptions', short: 'Requests', icon: 'redemptions' },
  { to: '/parent/tutor-sessions', label: 'Tutor transcripts', short: 'Chats', icon: 'transcripts' },
  { to: '/parent/analytics', label: 'Analytics', short: 'Analytics', icon: 'assessment', match: ['/parent/assessment'] },
]

export function isParentPath(pathname) {
  return pathname === '/parent' || pathname.startsWith('/parent/')
}

export function isActive(item, pathname) {
  if (item.end) return pathname === item.to
  if (pathname === item.to || pathname.startsWith(item.to + '/')) return true
  return (item.match || []).some((prefix) => pathname.startsWith(prefix))
}
