import { describe, it, expect } from 'vitest'
import { buildPackSteps, groupSteps, packProgress, currentPacks, collapsePacks, EXAM_GROUP } from '../src/lib/studyPacks.js'
import { assignmentAction } from '../src/lib/assignments.js'

const topic = { id: 't1', name: 'Energy' }
const catalog = {
  subtopics: [
    { id: 's1', topic_id: 't1', name: 'Power' },
    { id: 's2', topic_id: 't1', name: 'Efficiency' },
    { id: 'sx', topic_id: 't2', name: 'Elsewhere' },
  ],
  quizzes: [
    { id: 'qz0', topic_id: 't1', subtopic_id: null, title: 'Quiz 1', question_count: 20 },
    { id: 'qz1', topic_id: 't1', subtopic_id: 's1', title: 'Power quiz', question_count: 8 },
  ],
  examQuestions: [
    { id: 'w1', subtopic_id: 's1', command_word: 'calculate', total_marks: 4 },
    { id: 'w2', subtopic_id: 's1', command_word: 'explain', total_marks: 5 },
  ],
  papers: [{ ref: 'energy-practice', topic_id: 't1', title: 'Energy exam practice', total_marks: 25, duration_minutes: 30 }],
}

describe('buildPackSteps', () => {
  it('gives tutor, quiz and written per lesson in order, then the exam set', () => {
    const steps = buildPackSteps(topic, catalog)
    expect(steps.map((s) => s.key)).toEqual([
      'tutor_session:s1', 'quiz:qz1', 'written_test:w1',
      'tutor_session:s2', 'quiz:none:s2', 'written_test:none:s2',
      'mock_paper:energy-practice',
    ])
    expect(steps[1].item).toEqual({ type: 'quiz', title: 'Power quiz', quiz_id: 'qz1', subtopic_id: 's1' })
    expect(steps[2].item.title).toBe('Power: written answer (4 marks)')
    expect(steps[2].detail).toBe('Calculate · 4 marks')
    expect(steps[4].available).toBe(false)
    expect(steps[6].group).toBe(EXAM_GROUP)
  })

  it('never uses a topic-wide quiz for a lesson', () => {
    const steps = buildPackSteps(topic, catalog)
    expect(steps.some((s) => s.item?.quiz_id === 'qz0')).toBe(false)
  })

  it('prefers a written question not answered yet, and flags done and pending work', () => {
    const done = { tutor: new Map([['s1', {}]]), quiz: new Map(), written: new Map([['w1', {}]]) }
    const assignments = [
      { type: 'quiz', quiz_id: 'qz1', status: 'pending' },
      { type: 'mock_paper', paper_ref: 'energy-practice', status: 'completed' },
    ]
    const steps = buildPackSteps(topic, catalog, done, assignments)
    const byKey = Object.fromEntries(steps.map((s) => [s.key, s]))
    expect(byKey['written_test:w2']).toBeTruthy()
    expect(byKey['tutor_session:s1'].done).toBe(true)
    expect(byKey['quiz:qz1'].pending).toBe(true)
    expect(byKey['mock_paper:energy-practice'].done).toBe(true)
  })

  it('says when a topic has no exam set', () => {
    const steps = buildPackSteps(topic, { ...catalog, papers: [] })
    expect(steps.at(-1)).toMatchObject({ type: 'mock_paper', available: false })
  })
})

describe('groupSteps', () => {
  it('groups consecutive steps by lesson', () => {
    const groups = groupSteps(buildPackSteps(topic, catalog))
    expect(groups.map((g) => [g.name, g.steps.length])).toEqual([['Power', 3], ['Efficiency', 3], [EXAM_GROUP, 1]])
  })
})

describe('packProgress', () => {
  it('counts done steps, ignores cancelled ones and finds the next in order', () => {
    const p = packProgress([
      { id: 'c', pack_position: 3, status: 'pending' },
      { id: 'a', pack_position: 1, status: 'completed' },
      { id: 'b', pack_position: 2, status: 'cancelled' },
      { id: 'd', pack_position: 4, status: 'pending' },
    ])
    expect(p).toMatchObject({ total: 3, done: 1 })
    expect(p.next.id).toBe('c')
  })
})

const pack = (o) => ({ status: 'pending', subject_id: 'phys', assigned_at: '2026-11-15T10:00:00Z', due_at: null, ...o })

describe('currentPacks', () => {
  it('picks the lowest pending pack in the queue for each subject', () => {
    const cur = currentPacks([
      pack({ id: 'p1', queue_position: 1, status: 'completed' }),
      pack({ id: 'p3', queue_position: 3 }),
      pack({ id: 'p2', queue_position: 2 }),
      pack({ id: 'c1', subject_id: 'chem', queue_position: 1 }),
    ])
    expect(cur.get('phys').id).toBe('p2')
    expect(cur.get('chem').id).toBe('c1')
  })
})

describe('collapsePacks', () => {
  const packs = [
    pack({ id: 'p1', title: 'Energy', queue_position: 1 }),
    pack({ id: 'p2', title: 'Electricity', queue_position: 2 }),
    pack({ id: 'p0', title: 'Old', queue_position: 0, status: 'completed' }),
  ]
  const assignments = [
    { id: 'loose', status: 'pending', type: 'quiz' },
    { id: 'e1', pack_id: 'p1', pack_position: 1, status: 'completed', completed_at: '2026-11-15T11:00:00Z' },
    { id: 'e2', pack_id: 'p1', pack_position: 2, status: 'pending', type: 'quiz' },
    { id: 'l1', pack_id: 'p2', pack_position: 1, status: 'pending', type: 'tutor_session' },
    { id: 'o1', pack_id: 'p0', pack_position: 1, status: 'completed' },
  ]

  it('shows each pending pack once, keeps loose and finished work', () => {
    const out = collapsePacks(assignments, packs)
    expect(out.map((a) => a.id).sort()).toEqual(['e1', 'loose', 'o1', 'pack:p1', 'pack:p2'])
  })

  it('lets every pending pack be worked on, with no queue per subject', () => {
    const out = collapsePacks(assignments, packs)
    const energy = out.find((a) => a.id === 'pack:p1')
    const elec = out.find((a) => a.id === 'pack:p2')
    expect(energy).toMatchObject({ isCurrent: true, waitingFor: null, type: 'study_pack' })
    expect(energy.progress).toMatchObject({ total: 2, done: 1 })
    expect(energy.progress.next.id).toBe('e2')
    expect(elec).toMatchObject({ isCurrent: true, waitingFor: null })
  })

  it('links every pending pack to start or continue', () => {
    const out = collapsePacks(assignments, packs)
    expect(assignmentAction(out.find((a) => a.id === 'pack:p1'))).toEqual({ label: 'Continue', to: '/pack/p1' })
    expect(assignmentAction(out.find((a) => a.id === 'pack:p2'))).toEqual({ label: 'Start pack', to: '/pack/p2' })
  })
})

describe('assignmentAction', () => {
  it('passes the assignment id so that assignment is the one ticked off', () => {
    expect(assignmentAction({ id: 'a1', type: 'quiz', quiz_id: 'q1' }).to).toBe('/play/q1?assignment=a1')
    expect(assignmentAction({ id: 'a2', type: 'tutor_session', subtopic_id: 's1' }).to).toBe('/tutor?subtopicId=s1&assignment=a2')
    expect(assignmentAction({ id: 'a3', type: 'written_test', exam_question_id: 'w1' }).to).toBe('/written/w1?assignment=a3')
  })
})
