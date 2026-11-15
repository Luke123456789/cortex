// The parent's "Assigned" rundown: a student's pending work grouped by
// subject, with each study pack as one entry. Pure; tested in
// test/workload.test.js.
import { ASSIGNMENT_TYPE_LABELS } from './assignments'
import { packProgress } from './studyPacks'
import { dueDayKey } from './week'

function localKey(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const byDueThenAssigned = (a, b) => {
  const da = dueDayKey(a.due_at)
  const db = dueDayKey(b.due_at)
  if (da !== db) {
    if (!da) return 1
    if (!db) return -1
    return da.localeCompare(db)
  }
  return new Date(a.assigned_at) - new Date(b.assigned_at)
}

// names: { subject(id) -> name|undefined, topic(id) -> name|undefined }
// Returns [{ subjectId, name, entries: [...] }] sorted by subject name, with
// entries sorted by due date (undated last) then when they were set.
export function groupWorkload(assignments, packs, names, now = new Date()) {
  const today = localKey(now)
  const entries = []
  for (const p of packs.filter((x) => x.status === 'pending')) {
    const progress = packProgress(assignments.filter((a) => a.pack_id === p.id))
    entries.push({
      kind: 'pack',
      id: p.id,
      subjectId: p.subject_id ?? null,
      title: `${p.title} study pack`,
      typeLabel: 'Study pack',
      detail: `${progress.done} of ${progress.total} done`,
      topic: names.topic(p.topic_id) || null,
      due_at: p.due_at,
      assigned_at: p.assigned_at,
    })
  }
  for (const a of assignments.filter((x) => x.status === 'pending' && !x.pack_id)) {
    entries.push({
      kind: 'item',
      id: a.id,
      subjectId: a.subject_id ?? null,
      title: a.title,
      typeLabel: ASSIGNMENT_TYPE_LABELS[a.type] || a.type,
      detail: null,
      topic: names.topic(a.topic_id) || null,
      due_at: a.due_at,
      assigned_at: a.assigned_at,
    })
  }
  for (const e of entries) {
    const key = dueDayKey(e.due_at)
    e.overdue = !!key && key < today
  }

  const groups = new Map()
  for (const e of entries) {
    const k = e.subjectId || 'none'
    if (!groups.has(k)) groups.set(k, { subjectId: e.subjectId, name: names.subject(e.subjectId) || 'Other', entries: [] })
    groups.get(k).entries.push(e)
  }
  return [...groups.values()]
    .map((g) => ({ ...g, entries: g.entries.sort(byDueThenAssigned) }))
    .sort((a, b) => (a.name === 'Other') - (b.name === 'Other') || a.name.localeCompare(b.name))
}

// How many things a list of entries is, counting a pack once.
export function workloadCount(groups) {
  return groups.reduce((n, g) => n + g.entries.length, 0)
}
