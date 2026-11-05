import { describe, it, expect } from 'vitest'
import { assessTyping, phraseSignals, combineAi, buildIntegrity } from '../supabase/functions/mark-written-answer/integrity-logic.js'

const answer = (n) => 'a'.repeat(n)
const typed = (n, extra = {}) => ({ typedChars: n, pastedChars: 0, pasteCount: 0, largestPaste: 0, droppedChars: 0, activeMs: 5 * 60000, tabAways: 0, ...extra })

describe('assessTyping', () => {
  it('passes a normally typed answer', () => {
    const r = assessTyping(typed(600), answer(580))
    expect(r.recorded).toBe(true)
    expect(r.flags).toEqual([])
    expect(r.cpm).toBe(120)
  })

  it('flags a missing record', () => {
    expect(assessTyping(null, answer(100)).flags[0]).toMatch(/No typing record/)
  })

  it('flags heavy pasting and a single big paste', () => {
    expect(assessTyping(typed(200, { pastedChars: 400, pasteCount: 2, largestPaste: 350 }), answer(600)).flags[0]).toMatch(/^67% of the answer was pasted/)
    expect(assessTyping(typed(900, { pastedChars: 160, pasteCount: 1, largestPaste: 160 }), answer(1000)).flags[0]).toBe('One paste of 160 characters.')
  })

  it('flags text that appeared without typing or pasting', () => {
    expect(assessTyping(typed(100), answer(600)).flags[0]).toMatch(/About 500 characters appeared/)
  })

  it('flags implausibly fast typing', () => {
    const r = assessTyping(typed(3000, { activeMs: 60000 }), answer(3000))
    expect(r.flags.some((f) => f.startsWith('Typed unusually fast'))).toBe(true)
  })

  it('ignores junk values', () => {
    expect(assessTyping({ typedChars: 'x', pastedChars: -5 }, answer(10)).pastedChars).toBe(0)
  })
})

describe('phraseSignals', () => {
  it('spots AI-style phrasing and formatting', () => {
    const s = phraseSignals('This essay will delve into a rich tapestry of themes.\n## Context\n**Bold** point')
    expect(s.some((x) => x.includes('"delve"'))).toBe(true)
    expect(s.some((x) => x.includes('Markdown'))).toBe(true)
  })

  it('leaves an ordinary answer alone', () => {
    expect(phraseSignals("Macbeth is confused because he sees a dagger that isn't there. It shows his guilt.")).toEqual([])
  })

  it('needs two phrase hits, not one', () => {
    expect(phraseSignals('This is a pivotal moment in the play.')).toEqual([])
  })

  it('notices lists, em dashes and curly quotes', () => {
    expect(phraseSignals('- one\n- two\n- three')).toContain('Written as a bulleted or numbered list.')
    expect(phraseSignals('a — b — c — d').some((x) => x.includes('em dashes'))).toBe(true)
    expect(phraseSignals('He said “hello”.').some((x) => x.includes('smart'))).toBe(true)
  })
})

describe('combineAi and buildIntegrity', () => {
  it('takes the higher of the two judgements', () => {
    expect(combineAi([{ aiLikelihood: 'low', aiSignals: ['a'] }, { aiLikelihood: 'high', aiSignals: ['b'] }])).toEqual({ likelihood: 'high', signals: ['a', 'b'] })
    expect(combineAi([null, { aiLikelihood: 'weird' }])).toEqual({ likelihood: null, signals: [] })
  })

  it('flags high AI likelihood, and medium only with phrase signals', () => {
    const t = typed(600)
    expect(buildIntegrity({ telemetry: t, answer: answer(580), runs: [{ aiLikelihood: 'high' }] }).flagged).toBe(true)
    expect(buildIntegrity({ telemetry: t, answer: answer(580), runs: [{ aiLikelihood: 'medium' }] }).flagged).toBe(false)
    const ai = 'We delve into a tapestry. ' + 'x'.repeat(560)
    expect(buildIntegrity({ telemetry: t, answer: ai, runs: [{ aiLikelihood: 'medium' }] }).reasons).toContain('Possibly AI-written (medium likelihood).')
  })

  it('passes a clean answer', () => {
    const r = buildIntegrity({ telemetry: typed(600), answer: answer(580), runs: [{ aiLikelihood: 'low' }, { aiLikelihood: 'low' }] })
    expect(r).toMatchObject({ flagged: false, reasons: [] })
  })
})
