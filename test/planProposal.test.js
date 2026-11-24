import { describe, it, expect } from 'vitest'
import { apportion, rankTopics, candidatesFor, proposeWork, swapItem, removeItem, weekDueAt, toAssignmentRows, keyOfAssignment } from '../src/lib/planProposal.js'

const catalog = {
  topics: [
    { id: 'pE', subject_id: 'phy', name: 'Energy' },
    { id: 'pF', subject_id: 'phy', name: 'Forces' },
    { id: 'pW', subject_id: 'phy', name: 'Waves' },
    { id: 'mN', subject_id: 'mat', name: 'Number' },
  ],
  subtopics: [
    { id: 'sE1', topic_id: 'pE', name: 'Energy stores' },
    { id: 'sE2', topic_id: 'pE', name: 'Power' },
    { id: 'sF1', topic_id: 'pF', name: 'Newton\'s laws' },
    { id: 'sW1', topic_id: 'pW', name: 'Wave speed' },
    { id: 'sN1', topic_id: 'mN', name: 'Fractions' },
  ],
  examQuestions: [
    { id: 'q1', topic_id: 'pE', subtopic_id: 'sE1', total_marks: 2 },
    { id: 'q2', topic_id: 'pE', subtopic_id: 'sE2', total_marks: 6 },
    { id: 'q3', topic_id: 'pF', subtopic_id: 'sF1', total_marks: 4 },
    { id: 'q4', topic_id: 'pW', subtopic_id: 'sW1', total_marks: 3 },
    { id: 'q5', topic_id: 'mN', subtopic_id: 'sN1', total_marks: 5 },
  ],
  papers: [
    { ref: 'phy-p1', subject_id: 'phy', topic_id: null, title: 'Physics Paper 1: Mock 1' },
    { ref: 'phy-energy', subject_id: 'phy', topic_id: 'pE', title: 'Energy: exam practice' },
    { ref: 'mat-p1', subject_id: 'mat', topic_id: null, title: 'Maths Paper 1: Mock 1' },
  ],
  quizzes: [{ id: 'z1', topic_id: 'pF', subtopic_id: null, title: 'Forces quiz' }],
}
const history = (over = {}) => ({
  topicScores: new Map([['pF', 40], ['pE', 85]]), // Forces weak, Energy strong, Waves unscored
  tutoredAt: new Map(), attemptedQuestions: new Set(), pendingQuestions: new Set(), pendingSubtopics: new Set(),
  donePapers: new Set(), pendingPapers: new Set(), pendingQuizzes: new Set(), quizzedAt: new Map(),
  ...over,
})

describe('apportion', () => {
  it('splits by weight with largest remainders', () => {
    expect(apportion(4, { a: 120, b: 120 })).toEqual({ a: 2, b: 2 })
    expect(apportion(5, { a: 180, b: 60 })).toEqual({ a: 4, b: 1 })
    expect(apportion(3, { a: 60, b: 0 })).toEqual({ a: 3 })
    expect(apportion(0, { a: 60 })).toEqual({ a: 0 })
  })
})

describe('rankTopics', () => {
  it('puts weak first, then unscored, then strong', () => {
    expect(rankTopics(catalog.topics.slice(0, 3), history().topicScores).map((t) => t.id)).toEqual(['pF', 'pW', 'pE'])
  })
})

describe('candidatesFor', () => {
  const ctx = { catalog, history: history() }
  it('tutor: weakest topic first, never-tutored first, nothing pending', () => {
    const c = candidatesFor('tutor_session', 'phy', { catalog, history: history({ pendingSubtopics: new Set(['sW1']) }) })
    expect(c.map((x) => x.subtopic_id)).toEqual(['sF1', 'sE1', 'sE2'])
  })
  it('written: skips attempted questions and rotates topics', () => {
    const c = candidatesFor('written_test', 'phy', { catalog, history: history({ attemptedQuestions: new Set(['q3']) }) })
    expect(c.map((x) => x.exam_question_id)).toEqual(['q4', 'q2', 'q1']) // Forces exhausted, Waves, then Energy (6-marker first)
    expect(c[1].title).toBe('Power: written answer (6 marks)')
  })
  it('papers: full mocks before topic practice, skipping done ones', () => {
    expect(candidatesFor('mock_paper', 'phy', ctx).map((x) => x.paper_ref)).toEqual(['phy-p1', 'phy-energy'])
    expect(candidatesFor('mock_paper', 'phy', { catalog, history: history({ donePapers: new Set(['phy-p1']) }) }).map((x) => x.paper_ref)).toEqual(['phy-energy'])
  })
})

describe('proposeWork', () => {
  const ctx = { catalog, history: history() }
  const targets = { subjectMinutes: { phy: 120, mat: 120 }, tutor_sessions: 2, exam_questions: 3, papers: 2, quizzes: 0 }

  it('splits counts across subjects and fills a short subject from the other', () => {
    const p = proposeWork(targets, ctx)
    const by = (t) => p.items.filter((i) => i.type === t)
    expect(by('tutor_session').map((i) => i.subject_id).sort()).toEqual(['mat', 'phy'])
    expect(by('written_test')).toHaveLength(3) // maths has 1 question, so physics covers the rest
    expect(by('mock_paper').map((i) => i.paper_ref).sort()).toEqual(['mat-p1', 'phy-p1'])
    expect(p.shortfall).toEqual({})
  })

  it('reports a shortfall when there is not enough content', () => {
    const p = proposeWork({ ...targets, papers: 5 }, ctx)
    expect(p.shortfall).toEqual({ mock_paper: 2 })
  })

  it('counts already-approved items against the targets and never repeats them', () => {
    const existing = [{ type: 'tutor_session', key: 'tutor:sF1' }]
    const p = proposeWork({ ...targets, exam_questions: 0, papers: 0 }, ctx, existing)
    expect(p.items).toHaveLength(1)
    expect(p.items[0].key).not.toBe('tutor:sF1')
  })

  it('swaps and removes', () => {
    const p = proposeWork({ subjectMinutes: { phy: 60 }, tutor_sessions: 1 }, ctx)
    expect(p.items[0].subtopic_id).toBe('sF1')
    const s = swapItem(p, p.items[0].key)
    expect(s.items[0].subtopic_id).toBe('sW1')
    expect(swapItem(swapItem(s, s.items[0].key), 'nope').items).toHaveLength(1)
    expect(removeItem(s, s.items[0].key).items).toHaveLength(0)
  })
})

describe('assignment rows', () => {
  it('are due on the Sunday of the week and linked to the plan', () => {
    const due = weekDueAt('2026-11-23')
    expect(due.getDay()).toBe(0)
    expect(due.getDate()).toBe(29)
    const [row] = toAssignmentRows([{ type: 'mock_paper', key: 'paper:x', subject_id: 'phy', topic_id: 'pE', paper_ref: 'x', title: 'X' }],
      { studentId: 's', parentId: 'p', planId: 'plan', weekStart: '2026-11-23', note: '' })
    expect(row).toMatchObject({ student_id: 's', assigned_by: 'p', plan_id: 'plan', type: 'mock_paper', paper_ref: 'x', topic_id: null, note: null })
    expect(keyOfAssignment({ type: 'mock_paper', paper_ref: 'x' })).toBe('paper:x')
  })
})

import { writtenMinutes, quizMinutes, estimateAssignment, plannedBySubject, timeCheck, fillToHours } from '../src/lib/planProposal.js'

describe('time estimates and fill to hours', () => {
  const cat = { ...catalog, papers: catalog.papers.map((p) => ({ ...p, duration_minutes: p.topic_id ? 30 : 105 })), quizzes: [{ ...catalog.quizzes[0], question_count: 12 }] }
  const ctx = { catalog: cat, history: history() }

  it('estimates by type', () => {
    expect(writtenMinutes(6)).toBe(9)
    expect(writtenMinutes(1)).toBe(3)
    expect(quizMinutes(12)).toBe(9)
    expect(estimateAssignment({ type: 'mock_paper', paper_ref: 'phy-p1' }, cat)).toBe(105)
    expect(estimateAssignment({ type: 'written_test', exam_question_id: 'q2' }, cat)).toBe(9)
    expect(estimateAssignment({ type: 'tutor_session' }, cat)).toBe(20)
  })

  it('compares planned time with the hours, per subject', () => {
    const p = proposeWork({ subjectMinutes: { phy: 120, mat: 30 }, tutor_sessions: 2 }, ctx)
    const planned = plannedBySubject(p.items)
    const check = timeCheck({ phy: 120, mat: 30 }, planned)
    expect(check.find((c) => c.subject_id === 'phy')).toMatchObject({ planned: 40, status: 'short', gap: 80 }) // both sessions go to Physics (1.6 vs 0.4)
  })

  it('fills short subjects with written answers, then tutor sessions, without repeats', () => {
    const p = proposeWork({ subjectMinutes: { phy: 60 }, tutor_sessions: 1 }, ctx)
    const filled = fillToHours(p, { phy: 60 }, ctx)
    const keys = filled.items.map((i) => i.key)
    expect(new Set(keys).size).toBe(keys.length)
    const planned = plannedBySubject(filled.items).phy
    expect(planned).toBeGreaterThanOrEqual(50)
    expect(filled.items.some((i) => i.type === 'written_test')).toBe(true)
  })

  it('counts already-set work towards the hours', () => {
    const existing = [{ key: 'paper:phy-p1', subject_id: 'phy', est: 105 }]
    const filled = fillToHours({ items: [], pools: {}, shortfall: {} }, { phy: 100 }, ctx, existing)
    expect(filled.items).toHaveLength(0)
  })
})
