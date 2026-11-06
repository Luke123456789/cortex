import { describe, it, expect } from 'vitest'
import {
  lengthBand,
  buildRewritePrompt,
  extractDistractors,
  placeOptions,
  buildVerifyPrompt,
  verdict,
  REWRITE_TOOL,
  VERIFY_TOOL,
} from '../supabase/functions/rewrite-distractors/rewrite-logic.js'

const tool = (name, input) => ({ content: [{ type: 'tool_use', name, input }] })

describe('lengthBand', () => {
  it('uses ±8 chars for short answers and 80–120% otherwise', () => {
    expect(lengthBand("Scrooge's own grave")).toEqual([11, 27])
    expect(lengthBand('x'.repeat(100))).toEqual([80, 120])
  })
})

describe('buildRewritePrompt', () => {
  it('includes the question, the fixed answer, the band and any feedback', () => {
    const p = buildRewritePrompt({ subject: 'English Literature', examBoard: 'AQA', topic: 'Macbeth', subtopic: 'Act 5', question: 'Why fight?', correctText: 'x'.repeat(50), oldWrong: ['a', 'b', 'c'], feedback: 'too short' })
    expect(p).toContain('GCSE English Literature (AQA)')
    expect(p).toContain('Macbeth > Act 5')
    expect(p).toContain('40-60 characters long')
    expect(p).toContain('"a"; "b"; "c"')
    expect(p).toContain('fix them: too short')
  })
})

describe('extractDistractors', () => {
  it('needs exactly three non-empty strings', () => {
    expect(extractDistractors(tool(REWRITE_TOOL.name, { distractors: [' a ', 'b', 'c'] }))).toEqual(['a', 'b', 'c'])
    expect(extractDistractors(tool(REWRITE_TOOL.name, { distractors: ['a', 'b'] }))).toBeNull()
    expect(extractDistractors(tool(REWRITE_TOOL.name, { distractors: ['a', '', 'c'] }))).toBeNull()
    expect(extractDistractors({ content: [] })).toBeNull()
  })
})

describe('placeOptions', () => {
  it('keeps the correct answer in its letter', () => {
    expect(placeOptions('C', 'right', ['w1', 'w2', 'w3'])).toEqual({ A: 'w1', B: 'w2', C: 'right', D: 'w3' })
  })
})

describe('verify', () => {
  it('builds a prompt listing the options', () => {
    expect(buildVerifyPrompt({ subject: 'Biology', question: 'Q?', options: { A: 'a', B: 'b', C: 'c', D: 'd' } })).toContain('C. c')
  })

  it('passes only when the verifier picks the intended answer and nothing else', () => {
    expect(verdict(tool(VERIFY_TOOL.name, { answer: 'B', also_defensible: [] }), 'B')).toMatchObject({ ok: true })
    expect(verdict(tool(VERIFY_TOOL.name, { answer: 'B', also_defensible: ['B'] }), 'B')).toMatchObject({ ok: true })
    expect(verdict(tool(VERIFY_TOOL.name, { answer: 'A', also_defensible: [] }), 'B')).toMatchObject({ ok: false, reason: 'verifier chose A' })
    expect(verdict(tool(VERIFY_TOOL.name, { answer: 'B', also_defensible: ['D'] }), 'B')).toMatchObject({ ok: false, reason: 'also defensible: D' })
    expect(verdict({ content: [] }, 'B').ok).toBe(false)
  })
})
