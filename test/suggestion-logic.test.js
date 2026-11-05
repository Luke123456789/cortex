import { describe, it, expect } from 'vitest'
import {
  buildStats,
  buildCandidates,
  buildSuggestionPrompt,
  extractSuggestions,
  SUGGESTION_TOOL,
  MAX_SUGGESTIONS,
} from '../supabase/functions/suggest-assignments/suggestion-logic.js'

const now = new Date('2026-11-05T12:00:00Z')
const subjects = [
  { id: 'bio', name: 'Biology', exam_board: 'AQA' },
  { id: 'chem', name: 'Chemistry', exam_board: 'AQA' },
]
const topics = [
  { id: 'cells', subject_id: 'bio', name: 'Cell Biology', display_order: 1 },
  { id: 'organ', subject_id: 'bio', name: 'Organisation', display_order: 2 },
  { id: 'atoms', subject_id: 'chem', name: 'Atomic structure', display_order: 1 },
  { id: 'empty', subject_id: 'chem', name: 'No quiz yet', display_order: 2 },
]
const subtopics = [
  { id: 'cells-1', topic_id: 'cells', name: 'Cell structure', display_order: 1 },
  { id: 'cells-2', topic_id: 'cells', name: 'Microscopy', display_order: 2 },
  { id: 'cells-3', topic_id: 'cells', name: 'Cell division', display_order: 3 },
  { id: 'atoms-1', topic_id: 'atoms', name: 'Atoms and elements', display_order: 1 },
  { id: 'empty-1', topic_id: 'empty', name: 'Nothing', display_order: 1 },
]
const quizzes = [
  { id: 'qc1', topic_id: 'cells', title: 'Quiz 1', question_count: 20, display_order: 1 },
  { id: 'qc2', topic_id: 'cells', title: 'Quiz 2', question_count: 20, display_order: 2 },
  { id: 'qo1', topic_id: 'organ', title: 'Quiz 1', question_count: 20, display_order: 1 },
  { id: 'qa1', topic_id: 'atoms', title: 'Quiz 1', question_count: 15, display_order: 1 },
  { id: 'qe0', topic_id: 'empty', title: 'Empty', question_count: 0, display_order: 1 },
]
const quizSessions = [
  { quiz_id: 'qc1', topic_id: 'cells', score: 18, question_count: 20, completed_at: '2026-11-01T10:00:00Z' },
  { quiz_id: 'qo1', topic_id: 'organ', score: 10, question_count: 20, completed_at: '2026-10-20T10:00:00Z' },
  { quiz_id: 'qo1', topic_id: 'organ', score: null, question_count: 20, completed_at: null },
]
const tutorSessions = [
  { subtopic_id: 'cells-1', minutes_earned: 20, completed_at: '2026-11-02T10:00:00Z' },
  { subtopic_id: 'cells-2', minutes_earned: 0, completed_at: null },
]
const base = { subjects, topics, subtopics, quizzes, quizSessions, tutorSessions, pendingAssignments: [], now }

describe('buildStats', () => {
  it('aggregates completed work per topic and subject', () => {
    const { subjectStats, topicStats } = buildStats(base)
    const bio = subjectStats.find((s) => s.subjectId === 'bio')
    expect(bio).toMatchObject({ quizzes: 2, tutorSessions: 1, topicsTouched: 2, topics: 2, accuracy: 70, daysSinceActive: 3 })
    const chem = subjectStats.find((s) => s.subjectId === 'chem')
    expect(chem).toMatchObject({ quizzes: 0, tutorSessions: 0, accuracy: null, daysSinceActive: null, topicsTouched: 0 })
    expect(topicStats.get('organ').accuracy).toBe(50)
    expect(topicStats.get('cells').tutorSessions).toBe(1)
  })
})

describe('buildCandidates', () => {
  it('offers the next undone quiz and up to two untutored lessons per playable topic', () => {
    const c = buildCandidates(base)
    const cells = c.filter((x) => x.topicId === 'cells')
    expect(cells.find((x) => x.type === 'quiz').quizId).toBe('qc2')
    expect(cells.filter((x) => x.type === 'tutor_session').map((x) => x.subtopicId)).toEqual(['cells-2', 'cells-3'])
    expect(c.some((x) => x.topicId === 'empty')).toBe(false)
    expect(new Set(c.map((x) => x.ref)).size).toBe(c.length)
  })

  it('falls back to the least recently done quiz when all are done', () => {
    const c = buildCandidates(base)
    expect(c.find((x) => x.topicId === 'organ' && x.type === 'quiz')).toMatchObject({ quizId: 'qo1', previouslyDone: true })
  })

  it('skips pending work and locked subjects', () => {
    const c = buildCandidates({
      ...base,
      pendingAssignments: [{ quiz_id: 'qc2' }, { subtopic_id: 'cells-2' }],
      locks: [{ subject_id: 'chem', topic_id: null, locked_until: '2026-11-06T00:00:00Z' }],
    })
    expect(c.some((x) => x.quizId === 'qc2' || x.subtopicId === 'cells-2')).toBe(false)
    expect(c.some((x) => x.subjectId === 'chem')).toBe(false)
  })

  it('ignores expired locks', () => {
    const c = buildCandidates({ ...base, locks: [{ subject_id: 'chem', topic_id: null, locked_until: '2026-11-01T00:00:00Z' }] })
    expect(c.some((x) => x.subjectId === 'chem')).toBe(true)
  })
})

describe('buildSuggestionPrompt', () => {
  it('includes subject stats, refs and the pending list', () => {
    const { subjectStats, topicStats } = buildStats(base)
    const candidates = buildCandidates(base)
    const p = buildSuggestionPrompt({ studentName: 'James', subjectStats, topicStats, candidates, pendingAssignments: [{ title: 'Quiz 9' }] })
    expect(p).toContain('James')
    expect(p).toContain('Chemistry (AQA): 0/2 topics touched')
    expect(p).toContain('last active never')
    expect(p).toContain(`${candidates[0].ref} | `)
    expect(p).toContain('- Quiz 9')
  })
})

describe('extractSuggestions', () => {
  const candidates = buildCandidates(base)
  const response = (suggestions) => ({ content: [{ type: 'tool_use', name: SUGGESTION_TOOL.name, input: { overview: 'o', suggestions } }] })

  it('maps refs to real items and drops unknown refs and duplicates', () => {
    const quizRef = candidates.find((c) => c.type === 'quiz').ref
    const r = extractSuggestions(response([
      { ref: quizRef, reason: 'r1', focus: 'struggling' },
      { ref: quizRef, reason: 'dup', focus: 'struggling' },
      { ref: 'q999', reason: 'made up', focus: 'avoided' },
      { ref: 'x', reason: 'bad', focus: 'weird' },
    ]), candidates)
    expect(r.overview).toBe('o')
    expect(r.suggestions).toHaveLength(1)
    expect(r.suggestions[0]).toMatchObject({ reason: 'r1', focus: 'struggling', type: 'quiz' })
    expect(r.suggestions[0].quizId).toBeTruthy()
  })

  it('caps the number of suggestions and normalises focus', () => {
    const many = candidates.map((c) => ({ ref: c.ref, reason: 'r', focus: 'nonsense' }))
    const r = extractSuggestions(response([...many, ...many]), candidates)
    expect(r.suggestions.length).toBeLessThanOrEqual(MAX_SUGGESTIONS)
    expect(r.suggestions.every((s) => s.focus === 'consolidate')).toBe(true)
  })

  it('returns null for a malformed response', () => {
    expect(extractSuggestions({ content: [] }, candidates)).toBeNull()
    expect(extractSuggestions(null, candidates)).toBeNull()
  })
})
