// Checks every authored written-test file (scripts/authored/written/*.json)
// before it is turned into SQL: the database constraints, and mark schemes
// that add up so the marker can award every mark and no more.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { questionSql } from '../scripts/generate-written.mjs'

const DIR = join(import.meta.dirname, '..', 'scripts', 'authored', 'written')
const COMMAND_WORDS = ['state', 'describe', 'explain', 'evaluate', 'compare', 'justify', 'calculate', 'analyse', 'determine', 'explore']
const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).map((name) => ({ name, file: JSON.parse(readFileSync(join(DIR, name), 'utf8')) }))

// The scheme the generator would store, resolving shared English Literature levels.
function resolvedLevels(file, q) {
  if (q.scheme) return q.scheme.levels
  return q.levels === 'essay' ? file.shared.essay_levels : file.shared.paragraph_levels
}

describe('authored written questions', () => {
  it('covers every subject', () => {
    const subjects = files.map((f) => f.file.subject).sort()
    expect(subjects).toEqual(['Biology', 'Business', 'Chemistry', 'Economics', 'English Language', 'English Literature', 'Maths', 'Physical Education', 'Physics'])
  })

  it('has no repeated question text', () => {
    const texts = files.flatMap((f) => f.file.questions.map((q) => q.question_text))
    expect(new Set(texts).size).toBe(texts.length)
  })

  for (const { name, file } of files) {
    describe(name, () => {
      it('has a subject, exam board and questions', () => {
        expect(file.subject).toBeTruthy()
        expect(file.exam_board).toBeTruthy()
        expect(file.questions.length).toBeGreaterThan(0)
      })

      file.questions.forEach((q, i) => {
        const label = `#${i + 1} ${q.question_text.slice(0, 50)}`
        it(`${label}: fields meet the database constraints`, () => {
          expect(q.topic).toBeTruthy()
          expect(q.subtopic).toBeTruthy()
          expect(COMMAND_WORDS).toContain(q.command_word)
          expect(['foundation', 'higher']).toContain(q.difficulty)
          expect(Number.isInteger(q.total_marks) && q.total_marks > 0).toBe(true)
          expect(q.spag_marks ?? 0).toBeGreaterThanOrEqual(0)
        })

        it(`${label}: assessment objective marks add up to the total`, () => {
          const sum = Object.values(q.ao_marks || {}).reduce((a, b) => a + b, 0)
          expect(sum).toBe(q.total_marks)
        })

        const content = q.total_marks - (q.spag_marks || 0)
        if (q.marking_style === 'points') {
          it(`${label}: points scheme can award exactly the marks`, () => {
            expect(q.scheme.max).toBe(content)
            expect(q.scheme.points.length).toBeGreaterThanOrEqual(q.scheme.max)
          })
        } else {
          it(`${label}: levels run from 1 mark to the content total with no gaps`, () => {
            const levels = [...resolvedLevels(file, q)].sort((a, b) => a.marks[0] - b.marks[0])
            expect(levels[0].marks[0]).toBe(1)
            expect(levels[levels.length - 1].marks[1]).toBe(content)
            for (let j = 1; j < levels.length; j++) expect(levels[j].marks[0]).toBe(levels[j - 1].marks[1] + 1)
            levels.forEach((l) => expect(l.descriptor).toBeTruthy())
            expect((q.indicative || q.scheme?.indicative || []).length).toBeGreaterThan(0)
          })
          if (q.spag_marks) {
            it(`${label}: separately marked SPaG has a description`, () => {
              expect(q.scheme?.spag || file.shared?.spag).toBeTruthy()
            })
          }
        }

        it(`${label}: generates SQL`, () => {
          const sql = questionSql(file, q)
          expect(sql).toContain('insert into public.fm_exam_questions')
          expect(sql).toContain('insert into public.fm_mark_schemes')
        })
      })
    })
  }
})
