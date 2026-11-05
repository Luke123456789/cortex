import { describe, it, expect } from 'vitest'
import { dueDayKey, weekDays, groupWeek, upNext, dueLabel, daysLate, onTimeRate } from '../src/lib/week.js'

const now = new Date(2026, 10, 5, 15) // Thu 5 Nov 2026, 15:00 local
const due = (ymd) => `${ymd}T00:00:00.000Z`
let n = 0
const a = (overrides) => ({ id: `a${++n}`, status: 'pending', title: `Item ${n}`, assigned_at: '2026-11-01T10:00:00Z', due_at: null, completed_at: null, ...overrides })

describe('weekDays', () => {
  it('is today plus the next six days', () => {
    const d = weekDays(now)
    expect(d.map((x) => x.key)).toEqual(['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11'])
    expect(d[0].label).toBe('Today')
    expect(d[1].label).toBe('Tomorrow')
    expect(d[0].isToday).toBe(true)
  })
})

describe('dueDayKey', () => {
  it('uses the date the parent picked', () => {
    expect(dueDayKey('2026-11-12T00:00:00+00:00')).toBe('2026-11-12')
    expect(dueDayKey(null)).toBeNull()
  })
})

describe('groupWeek', () => {
  const list = [
    a({ due_at: due('2026-11-03') }), // earlier
    a({ due_at: due('2026-11-05') }), // today
    a({ due_at: due('2026-11-07') }),
    a({ due_at: due('2026-11-07'), assigned_at: '2026-10-01T00:00:00Z' }),
    a({ due_at: due('2026-11-11') }), // last day of the week
    a({ due_at: due('2026-11-12') }), // later
    a({}), // no due date
    a({ status: 'cancelled', due_at: due('2026-11-05') }),
    a({ status: 'completed', completed_at: '2026-11-04T10:00:00Z' }),
    a({ status: 'completed', completed_at: '2026-10-20T10:00:00Z' }),
  ]

  it('sorts pending work into earlier, each day, later and any time', () => {
    const g = groupWeek(list, now)
    expect(g.earlier).toHaveLength(1)
    expect(g.days[0].items).toHaveLength(1)
    expect(g.days[2].items).toHaveLength(2)
    expect(g.days[2].items[0].assigned_at).toBe('2026-10-01T00:00:00Z')
    expect(g.days[6].items).toHaveLength(1)
    expect(g.later).toHaveLength(1)
    expect(g.anytime).toHaveLength(1)
    expect(g.dueThisWeek).toBe(4)
    expect(g.doneThisWeek).toBe(1)
  })

  it('upNext puts earlier work first, then by due date', () => {
    const next = upNext(list, 3, now)
    expect(next.map((x) => dueDayKey(x.due_at))).toEqual(['2026-11-03', '2026-11-05', '2026-11-07'])
  })
})

describe('dueLabel', () => {
  it('names days this week and dates beyond', () => {
    expect(dueLabel(due('2026-11-05'), now)).toBe('Due today')
    expect(dueLabel(due('2026-11-06'), now)).toBe('Due tomorrow')
    expect(dueLabel(due('2026-11-09'), now)).toMatch(/^Due Monday$/)
    expect(dueLabel(due('2026-11-20'), now)).toMatch(/^Due Fri/)
    expect(dueLabel(null, now)).toBeNull()
  })
})

describe('daysLate and onTimeRate', () => {
  it('counts whole days past the due date', () => {
    expect(daysLate(due('2026-11-03'), now)).toBe(2)
    expect(daysLate(due('2026-11-05'), now)).toBe(0)
    expect(daysLate(due('2026-11-07'), now)).toBe(-2)
    expect(daysLate(null, now)).toBeNull()
  })

  it('works out the on-time rate for dated, recently completed work', () => {
    const list = [
      a({ status: 'completed', due_at: due('2026-11-04'), completed_at: new Date(2026, 10, 4, 20).toISOString() }), // on the day
      a({ status: 'completed', due_at: due('2026-11-01'), completed_at: new Date(2026, 10, 3, 9).toISOString() }), // 2 days late
      a({ status: 'completed', due_at: null, completed_at: new Date(2026, 10, 3, 9).toISOString() }), // no due date
      a({ status: 'completed', due_at: due('2026-09-01'), completed_at: new Date(2026, 8, 1, 9).toISOString() }), // too old
    ]
    expect(onTimeRate(list, 30, now)).toEqual({ onTime: 1, total: 2, pct: 50 })
    expect(onTimeRate([], 30, now)).toBeNull()
  })
})
