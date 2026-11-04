import { describe, it, expect } from 'vitest'
import { normaliseQuestionText, contentHash, toLetteredOptions, toRow, isWellFormed, allocate, buildSql, sqlString } from '../scripts/generate-subject.mjs'

const q = {
  question: '  What is the  charge of an electron? ',
  correct_answer: '-1',
  distractors: ['+1', '0', '+2'],
  explanation: 'Electrons have a relative charge of -1.',
  difficulty: 'hard',
  skill: 'analysis',
  involves_calculation: false,
}

describe('generate-subject helpers', () => {
  it('normalises whitespace and case before hashing', () => {
    expect(normaliseQuestionText('  A\n  b  ')).toBe('a b')
    expect(contentHash('What is X?')).toBe(contentHash('  what   is x? '))
  })

  it('keeps the correct answer under the stored letter', () => {
    for (let seed = 0; seed < 20; seed++) {
      const row = toLetteredOptions('right', ['w1', 'w2', 'w3'], (n) => (seed * 7) % n)
      expect(row[`option_${row.correct_option.toLowerCase()}`]).toBe('right')
    }
  })

  it('maps generation labels onto the table constraints', () => {
    const row = toRow(q)
    expect(row.difficulty).toBe('higher')
    expect(row.question_type).toBe('applied')
    expect(row.ao_weighting).toBe('AO3')
    expect(toRow({ ...q, difficulty: 'medium', skill: 'recall' })).toMatchObject({ difficulty: 'foundation', question_type: 'recall', ao_weighting: 'AO1' })
    expect(toRow({ ...q, involves_calculation: true }).question_type).toBe('calculation')
  })

  it('rejects malformed or duplicate-option questions', () => {
    expect(isWellFormed(q)).toBe(true)
    expect(isWellFormed({ ...q, distractors: ['+1', '0'] })).toBe(false)
    expect(isWellFormed({ ...q, distractors: ['+1', '0', '-1'] })).toBe(false)
    expect(isWellFormed({ ...q, explanation: '' })).toBe(false)
  })

  it('allocates a topic target across subtopics', () => {
    expect(allocate(20, 6)).toEqual([4, 4, 3, 3, 3, 3])
    expect(allocate(20, 6).reduce((a, b) => a + b)).toBe(20)
  })

  it('escapes SQL strings', () => {
    expect(sqlString("O'Brien")).toBe("'O''Brien'")
    expect(sqlString(null)).toBe('null')
  })

  it('tags every question with the batch id and builds a rollback', () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ ...toRow({ ...q, question: `Q${i}` }), id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}` }))
    const { sql, rollbackSql } = buildSql({
      spec: { subject: 'Chemistry', exam_board: 'AQA', spec_code: '8462' },
      batchId: 'batch-1',
      topics: [{ id: 'topic-1', name: 'T', spec_ref: 'C1', paper: 'Paper 1', display_order: 1, subtopics: [{ id: 'sub-1', name: 'S', spec_ref: '4.1.1', display_order: 1, rows }] }],
    })
    expect(sql.match(/insert into questions/g)).toHaveLength(1)
    expect(sql.match(/'batch-1'::uuid/g).length).toBeGreaterThanOrEqual(2)
    for (const r of rows) expect(sql).toContain(`'${r.question_text}'`)
    expect(sql.match(/insert into quizzes/g)).toHaveLength(2)
    expect(sql).toContain("z.title = 'Quiz ' || ((o.i % 2) + 1)")
    expect(rollbackSql).toContain("delete from questions where generation_batch_id = 'batch-1'::uuid")
    expect(rollbackSql).toContain("delete from topics where id = (select id from topics where subject_id = (select id from subjects where name = 'Chemistry') and name = 'T')")
  })
})

describe('balanceLetters', () => {
  it('spreads correct answers evenly and keeps the right answer attached', async () => {
    const { balanceLetters } = await import('../scripts/generate-subject.mjs')
    const rows = Array.from({ length: 100 }, (_, i) => ({ option_a: `right${i}`, option_b: 'w1', option_c: 'w2', option_d: 'w3', correct_option: 'A' }))
    balanceLetters(rows)
    const counts = { A: 0, B: 0, C: 0, D: 0 }
    rows.forEach((r, i) => {
      counts[r.correct_option]++
      expect(r[`option_${r.correct_option.toLowerCase()}`]).toBe(`right${i}`)
      expect(new Set([r.option_a, r.option_b, r.option_c, r.option_d]).size).toBe(4)
    })
    expect(counts).toEqual({ A: 25, B: 25, C: 25, D: 25 })
  })
})
