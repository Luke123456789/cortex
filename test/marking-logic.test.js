import { describe, it, expect } from 'vitest'
import {
  validateAnswer,
  reviewTolerance,
  buildMarkingPrompt,
  markingTool,
  extractMark,
  reconcile,
  computeMinutes,
  commandWordHint,
  cleanText,
} from '../supabase/functions/mark-written-answer/marking-logic.js'

const pointsQ = { question_text: 'Describe two differences.', command_word: 'describe', total_marks: 2 }
const pointsS = { marking_style: 'points', scheme: { max: 2, points: ['No nucleus', 'Plasmids'], guidance: 'Comparative' }, ao_marks: { AO1: 2 }, spag_marks: 0 }
const essayQ = { question_text: 'Explore Lady Macbeth.', command_word: 'explore', total_marks: 34 }
const essayS = {
  marking_style: 'levels',
  scheme: { levels: [{ level: 6, marks: [26, 30], descriptor: 'Convincing' }, { level: 1, marks: [1, 5], descriptor: 'Simple' }], indicative: ['Unsex me here'], spag: 'AO4 rules' },
  ao_marks: { AO1: 12, AO2: 12, AO3: 6, AO4: 4 },
  spag_marks: 4,
}
const response = (input) => ({ content: [{ type: 'tool_use', name: 'submit_mark', input }] })
const good = { content_marks: 2, spag_marks: 0, level: null, ao_awarded: { AO1: 2 }, credited: ['a'], missing: [], next_step: 'x', command_word_satisfied: true, summary: 's' }

describe('validateAnswer', () => {
  it('rejects empty and over-long answers and trims', () => {
    expect(validateAnswer('   ').ok).toBe(false)
    expect(validateAnswer(null).ok).toBe(false)
    expect(validateAnswer('x'.repeat(20001)).ok).toBe(false)
    expect(validateAnswer('  hello ')).toEqual({ ok: true, text: 'hello' })
  })
})

describe('reviewTolerance', () => {
  it('is 10% of the marks, at least 1', () => {
    expect(reviewTolerance(2)).toBe(1)
    expect(reviewTolerance(6)).toBe(1)
    expect(reviewTolerance(34)).toBe(3)
  })
})

describe('prompt and tool', () => {
  it('includes the scheme, answer and command word', () => {
    const p = buildMarkingPrompt({ question: pointsQ, scheme: pointsS, subjectName: 'Biology', examBoard: 'AQA', answer: 'They differ.' })
    expect(p).toContain('AQA examiner')
    expect(p).toContain('1. No nucleus')
    expect(p).toContain('They differ.')
    expect(p).toContain('describe: say what happens')
    expect(p).toContain('no separate spelling')
  })

  it('handles levels with SPaG', () => {
    const p = buildMarkingPrompt({ question: essayQ, scheme: essayS, subjectName: 'English Literature', examBoard: 'AQA', answer: 'Essay' })
    expect(p).toContain('content marks out of 30')
    expect(p).toContain('Level 6 (26-30 marks): Convincing')
    expect(p).toContain('out of 4')
    const tool = markingTool(essayQ, essayS)
    expect(tool.input_schema.properties.content_marks.maximum).toBe(30)
    expect(tool.input_schema.properties.spag_marks.maximum).toBe(4)
  })

  it('has hints for every allowed command word', () => {
    for (const w of ['state', 'describe', 'explain', 'evaluate', 'compare', 'justify', 'calculate', 'analyse', 'determine', 'explore']) {
      expect(commandWordHint(w)).toBeTruthy()
    }
  })
})

describe('extractMark', () => {
  it('reads and clamps a marking', () => {
    const m = extractMark(response({ ...good, content_marks: 9, ao_awarded: { AO1: 5, AO9: 1 }, credited: ['a', '', 3] }), pointsQ, pointsS)
    expect(m.marks).toBe(2)
    expect(m.aoAwarded).toEqual({ AO1: 2 })
    expect(m.credited).toEqual(['a'])
  })

  it('adds SPaG to content marks', () => {
    const m = extractMark(response({ ...good, content_marks: 20, spag_marks: 3, level: 4 }), essayQ, essayS)
    expect(m).toMatchObject({ marks: 23, contentMarks: 20, spagMarks: 3, level: 4 })
  })

  it('cleans stray quotes and empties missing at full marks', () => {
    const m = extractMark(response({ ...good, summary: 'Well done."', next_step: 'Say "because".', missing: ['nothing really'] }), pointsQ, pointsS)
    expect(m.summary).toBe('Well done.')
    expect(m.nextStep).toBe('Say "because".')
    expect(m.missing).toEqual([])
    expect(cleanText('"quoted"')).toBe('"quoted"')
  })

  it('returns null when malformed', () => {
    expect(extractMark({ content: [] }, pointsQ, pointsS)).toBeNull()
    expect(extractMark(response({}), pointsQ, pointsS)).toBeNull()
  })
})

describe('reconcile', () => {
  const run = (marks, tag) => ({ marks, summary: tag })
  it('takes the mean rounded down and flags big disagreements', () => {
    const r = reconcile(run(20, 'a'), run(23, 'b'), 34)
    expect(r.marks).toBe(21)
    expect(r.summary).toBe('a')
    expect(r.needsReview).toBe(false)
    expect(reconcile(run(15, 'a'), run(25, 'b'), 34).needsReview).toBe(true)
  })

  it('flags when one marking failed', () => {
    const r = reconcile(run(3, 'a'), null, 6)
    expect(r.marks).toBe(3)
    expect(r.needsReview).toBe(true)
    expect(reconcile(null, null, 6)).toBeNull()
  })
})

describe('computeMinutes', () => {
  it('pays a minute per mark plus 5 at 70%', () => {
    expect(computeMinutes(5, 6)).toBe(10)
    expect(computeMinutes(4, 6)).toBe(4)
    expect(computeMinutes(0, 6)).toBe(0)
    expect(computeMinutes(24, 34)).toBe(29)
  })
  it('pays nothing for the practice student', () => {
    expect(computeMinutes(6, 6, true)).toBe(0)
  })
})
