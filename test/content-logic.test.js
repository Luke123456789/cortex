import { describe, it, expect } from 'vitest'
import { BOARDS, normaliseCommandWord, COMMAND_WORDS, validateQuestion, validateBlueprint, withSources, nextComponents, questionsPrompt } from '../supabase/functions/generate-exam-content/content-logic.js'

const subtopics = [{ id: 's1', name: 'Cell structure', spec_ref: '4.1.1' }, { id: 's2', name: 'Cell division', spec_ref: '4.1.2' }]
const pointsQ = {
  subtopic: 'cell structure', command_word: 'Explain', total_marks: 3, difficulty: 'foundation',
  question_text: 'Explain why a plant cell has a cell wall but an animal cell does not.',
  marking_style: 'points', points: ['a', 'b', 'c'], guidance: 'g', spag_marks: 0, ao_marks: { AO1: 1, AO2: 2, bogus: 3 },
}
const levelsQ = {
  subtopic: 'Cell division', command_word: 'evaluate', total_marks: 6, difficulty: 'higher',
  question_text: 'Evaluate the use of embryonic stem cells in medicine. (6 marks)',
  marking_style: 'levels',
  levels: [{ level: 1, marks: [1, 2], descriptor: 'basic' }, { level: 3, marks: [5, 6], descriptor: 'top' }, { level: 2, marks: [3, 4], descriptor: 'mid' }],
  indicative: ['x', 'y', 'z'], guidance: 'g', spag_marks: 0, ao_marks: { AO3: 6 },
}

describe('validateQuestion', () => {
  it('accepts a points question and maps the subtopic case-insensitively', () => {
    const v = validateQuestion(pointsQ, subtopics)
    expect(v.ok).toBe(true)
    expect(v.row.subtopic_id).toBe('s1')
    expect(v.row.spec_ref).toBe('4.1.1')
    expect(v.row.command_word).toBe('explain')
    expect(v.row.scheme).toEqual({ max: 3, points: ['a', 'b', 'c'], guidance: 'g' })
    expect(v.row.ao_marks).toEqual({ AO1: 1, AO2: 2 })
  })
  it('accepts levels and sorts bands top first', () => {
    const v = validateQuestion(levelsQ, subtopics)
    expect(v.ok).toBe(true)
    expect(v.row.scheme.levels.map((l) => l.level)).toEqual([3, 2, 1])
  })
  it('tolerates a 0-mark band, SPaG left out of the total and 2-mark points', () => {
    const zero = validateQuestion({ ...levelsQ, levels: [...levelsQ.levels, { level: 0, marks: [0, 0], descriptor: 'nothing' }] }, subtopics)
    expect(zero.ok).toBe(true)
    const startsAtZero = validateQuestion({ ...levelsQ, levels: [{ level: 2, marks: [4, 6], descriptor: 'a' }, { level: 1, marks: [0, 3], descriptor: 'b' }] }, subtopics)
    expect(startsAtZero.ok).toBe(true)
    expect(startsAtZero.row.scheme.levels[1].marks).toEqual([1, 3])
    const essay = validateQuestion({ ...levelsQ, total_marks: 6, spag_marks: 4, spag: 'bands' }, subtopics)
    expect(essay.ok).toBe(true)
    expect(essay.row.total_marks).toBe(10)
    expect(validateQuestion({ ...pointsQ, total_marks: 5, points: ['a', 'b', 'c'] }, subtopics).ok).toBe(true)
  })
  it('rejects too few points, unknown subtopics and broken bands', () => {
    expect(validateQuestion({ ...pointsQ, points: ['a'] }, subtopics).ok).toBe(false)
    expect(validateQuestion({ ...pointsQ, subtopic: 'Nope' }, subtopics).ok).toBe(false)
    expect(validateQuestion({ ...levelsQ, levels: [{ level: 2, marks: [4, 6], descriptor: 'a' }, { level: 1, marks: [1, 2], descriptor: 'b' }] }, subtopics).ok).toBe(false)
    expect(validateQuestion({ ...levelsQ, total_marks: 8 }, subtopics).ok).toBe(false)
  })
  it('handles SPaG marks: content bands exclude them and the bands are required', () => {
    const essay = { ...levelsQ, total_marks: 10, spag_marks: 4, spag: 'bands' }
    expect(validateQuestion(essay, subtopics).ok).toBe(true)
    expect(validateQuestion({ ...essay, spag: undefined }, subtopics).ok).toBe(false)
  })
  it('skips the subtopic check for paper questions', () => {
    const v = validateQuestion({ ...pointsQ, subtopic: 'Whatever' }, null)
    expect(v.ok).toBe(true)
    expect(v.row.subtopic_id).toBeNull()
  })
})

describe('validateBlueprint', () => {
  const topics = [{ id: 't1', name: 'Cell Biology' }, { id: 't2', name: 'Bioenergetics' }]
  it('renumbers slots, keeps known sources and totals the marks', () => {
    const v = validateBlueprint({
      instructions: 'Answer all.',
      sources: [{ label: 'Source A', text: 'Once upon a time' }],
      slots: [
        { number: 3, topic: 'cell biology', total_marks: 10, theme: 'a', sources: ['Source A', 'Source Z'] },
        { number: 9, topic: 'Bioenergetics', total_marks: 6, theme: 'b' },
      ],
    }, topics)
    expect(v.ok).toBe(true)
    expect(v.plan.slots.map((s) => s.number)).toEqual([1, 2])
    expect(v.plan.slots[0].sources).toEqual(['Source A'])
    expect(v.plan.total).toBe(16)
  })
  it('rejects unknown topics', () => {
    expect(validateBlueprint({ slots: [{ topic: 'Nope', total_marks: 4 }] }, topics).ok).toBe(false)
  })
})

describe('withSources', () => {
  it('prints the slot\'s sources above the question', () => {
    const plan = { sources: [{ label: 'Source A', intro: 'from a novel', text: 'TEXT' }] }
    expect(withSources('Q1', { sources: ['Source A'] }, plan)).toBe('Source A — from a novel\n\nTEXT\n\n———\n\nQ1')
    expect(withSources('Q2', { sources: [] }, plan)).toBe('Q2')
  })
})

describe('nextComponents', () => {
  it('balances papers across components', () => {
    expect(nextComponents([1], [1, 2], 4)).toEqual([2, 1, 2, 1])
    expect(nextComponents([1, 2], [1, 2, 3], 3)).toEqual([3, 1, 2])
    expect(nextComponents([], [1, 2], 5)).toEqual([1, 2, 1, 2, 1])
  })
})

describe('board config', () => {
  it('covers every subject the app has (History not set up yet)', () => {
    for (const s of ['Biology', 'Chemistry', 'Physics', 'Maths', 'Economics', 'Business', 'English Language', 'English Literature', 'Physical Education']) {
      expect(BOARDS[s], s).toBeTruthy()
      for (const p of Object.values(BOARDS[s].papers)) expect(p.marks).toBeGreaterThan(0)
    }
  })
  it('asks for the right number of questions and lists existing ones', () => {
    const p = questionsPrompt({ subject: {}, board: BOARDS.Biology, topic: { name: 'Cell Biology' }, subtopics, existing: ['Old Q'], count: 4 })
    expect(p).toContain('Write 4 new')
    expect(p).toContain('- Old Q')
    expect(p).toContain('"Cell structure" [4.1.1]')
  })
})

describe('normaliseCommandWord', () => {
  it('maps to the words the database allows', () => {
    expect(normaliseCommandWord('Give')).toBe('state')
    expect(normaliseCommandWord('work out')).toBe('calculate')
    expect(normaliseCommandWord('Assess')).toBe('evaluate')
    expect(normaliseCommandWord('explain why')).toBe('explain')
    expect(normaliseCommandWord('write')).toBe('explore')
    expect(normaliseCommandWord('ponder')).toBe('explain')
    for (const w of ['Name', 'outline', 'suggest', 'plot', 'prove']) expect(COMMAND_WORDS).toContain(normaliseCommandWord(w))
  })
})
