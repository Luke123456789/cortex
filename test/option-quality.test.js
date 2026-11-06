import { describe, it, expect } from 'vitest'
import { checkQuestion, lengthOk, summarise } from '../supabase/functions/rewrite-distractors/option-quality.js'

describe('lengthOk', () => {
  it('allows ±10 chars for short answers and 70–135% for longer ones', () => {
    expect(lengthOk(18, 12)).toBe(true)
    expect(lengthOk(25, 12)).toBe(false)
    expect(lengthOk(80, 100)).toBe(true)
    expect(lengthOk(60, 100)).toBe(false)
    expect(lengthOk(140, 100)).toBe(false)
  })
})

describe('checkQuestion', () => {
  it('catches the give-aways in a real weak question', () => {
    const r = checkQuestion({
      A: 'It has no dramatic significance',
      B: 'It shows a final flicker of the courage he had at the start of the play, complicating a purely villainous reading of his character',
      C: 'It proves the witches lied about everything',
      D: 'It shows Macbeth has gone completely insane with no awareness',
    }, 'B')
    expect(r.ok).toBe(false)
    expect(r.correctIsLongest).toBe(true)
    expect(r.issues).toEqual(expect.arrayContaining([
      '3 wrong options not close in length to the correct one',
      'absolute words only in wrong options',
      'a throwaway option',
    ]))
  })

  it('flags hedging used only by the correct option', () => {
    const r = checkQuestion({
      A: 'Exports rise as the pound falls in value',
      B: 'Imports rise as foreign goods become cheaper',
      C: 'It could improve the balance as exports grow',
      D: 'Interest rates fall so savings are worth less',
    }, 'C')
    expect(r.issues).toContain('only the correct option hedges')
  })

  it('passes a balanced question', () => {
    const r = checkQuestion({ A: 'A dominant allele', B: 'A recessive allele', C: 'A mutated chromosome', D: 'A sex-linked gene' }, 'B')
    expect(r).toMatchObject({ ok: true, issues: [] })
  })

  it('catches duplicates and empties', () => {
    expect(checkQuestion({ A: 'x', B: 'x', C: 'y', D: '' }, 'C').issues).toEqual(expect.arrayContaining(['duplicate options', 'empty option']))
  })
})

describe('summarise', () => {
  it('reports the share where the correct option is longest', () => {
    const s = summarise([
      { options: { A: 'aaaa', B: 'b', C: 'c', D: 'd' }, correct: 'A' },
      { options: { A: 'a', B: 'bbbb', C: 'c', D: 'd' }, correct: 'A' },
    ])
    expect(s.correctIsLongestPct).toBe(50)
    expect(s.questions).toBe(2)
  })
})
