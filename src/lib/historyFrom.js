import { supabase } from './supabaseClient'

// The parent's "fresh start" date for this student (student_links.history_from):
// their history views only show activity from this day. Nothing older is
// deleted. Returns an ISO timestamp for local midnight, or null.
export async function getHistoryFrom(studentId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !studentId) return null
  const { data, error } = await supabase.from('student_links')
    .select('history_from').eq('parent_id', user.id).eq('student_id', studentId).maybeSingle()
  if (error || !data?.history_from) return null
  const [y, m, d] = data.history_from.split('-').map(Number)
  return new Date(y, m - 1, d).toISOString()
}
