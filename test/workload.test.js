import { describe, it, expect } from 'vitest'
import { groupWorkload, workloadCount } from '../src/lib/workload.js'

const now = new Date(2026, 10, 15, 12) // 15 Nov 2026
const subjects = { pe: 'Physical Education', phys: 'Physics' }
const topics = { t1: 'Energy', t2: 'Diet and nutrition' }
const names = { subject: (id) => subjects[id], topic: (id) => topics[id] }
const due = (ymd) => `${ymd}T00:00:00.000Z`

const assignments = [
  { id: 'a1', type: 'quiz', title: 'Quiz 1', status: 'pending', subject_id: 'pe', topic_id: 't2', due_at: due('2026-11-20'), assigned_at: '2026-11-01T10:00:00Z' },
  { id: 'a2', type: 'written_test', title: 'Written', status: 'pending', subject_id: 'pe', topic_id: 't2', due_at: due('2026-11-10'), assigned_at: '2026-11-02T10:00:00Z' },
  { id: 'a3', type: 'tutor_session', title: 'Tutor', status: 'pending', subject_id: 'pe', due_at: null, assigned_at: '2026-11-01T09:00:00Z' },
  { id: 'a4', type: 'quiz', title: 'Done one', status: 'completed', subject_id: 'pe', assigned_at: '2026-11-01T10:00:00Z' },
  { id: 'a5', type: 'quiz', title: 'Cancelled', status: 'cancelled', subject_id: 'pe', assigned_at: '2026-11-01T10:00:00Z' },
  { id: 's1', type: 'tutor_session', title: 'Step 1', status: 'completed', subject_id: 'phys', pack_id: 'p1', pack_position: 1 },
  { id: 's2', type: 'quiz', title: 'Step 2', status: 'pending', subject_id: 'phys', pack_id: 'p1', pack_position: 2 },
  { id: 'x1', type: 'mock_paper', title: 'Loose paper', status: 'pending', subject_id: null, assigned_at: '2026-11-03T10:00:00Z' },
]
const packs = [
  { id: 'p1', title: 'Energy', status: 'pending', subject_id: 'phys', topic_id: 't1', due_at: due('2026-11-15'), assigned_at: '2026-11-15T10:00:00Z' },
  { id: 'p0', title: 'Old', status: 'cancelled', subject_id: 'phys' },
]

describe('groupWorkload', () => {
  const groups = groupWorkload(assignments, packs, names, now)

  it('groups pending work by subject, with Other last', () => {
    expect(groups.map((g) => g.name)).toEqual(['Physical Education', 'Physics', 'Other'])
  })

  it('leaves out finished and cancelled work and shows each pack once', () => {
    expect(groups[0].entries.map((e) => e.id)).toEqual(['a2', 'a1', 'a3'])
    expect(groups[1].entries).toHaveLength(1)
    expect(groups[1].entries[0]).toMatchObject({ kind: 'pack', id: 'p1', title: 'Energy study pack', detail: '1 of 2 done', topic: 'Energy' })
    expect(workloadCount(groups)).toBe(5)
  })

  it('sorts by due date with undated work last, and marks overdue items', () => {
    const [overdue, later, undated] = groups[0].entries
    expect(overdue).toMatchObject({ id: 'a2', overdue: true, typeLabel: 'Written test', topic: 'Diet and nutrition' })
    expect(later.overdue).toBe(false)
    expect(undated.overdue).toBe(false)
    expect(groups[1].entries[0].overdue).toBe(false) // due today is not overdue
  })
})
