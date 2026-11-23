import { describe, it, expect } from 'vitest'
import { tutorShareText, writtenShareText, quizShareText, whatsappUrl } from '../src/lib/share.js'

const date = new Date('2026-11-23T20:00:00Z')

describe('tutorShareText', () => {
  it('includes the lesson, exam question, his answer, mark and feedback', () => {
    const t = tutorShareText({
      name: 'James', subject: 'Physics', topic: 'Energy', lesson: 'Specific heat capacity',
      exam: { question: 'Explain why... [6 marks]', answer: 'Because water has a high SHC', awarded: 4, available: 6 },
      feedback: 'Good use of key terms.', answers: 5, date,
    })
    expect(t).toContain("James's revision")
    expect(t).toContain('Physics › Energy › Specific heat capacity')
    expect(t).toContain('Explain why... [6 marks]')
    expect(t).toContain('Because water has a high SHC')
    expect(t).toContain('Mark: 4/6')
    expect(t).toContain('Feedback: Good use of key terms.')
    expect(t).toContain('Questions answered properly: 5')
  })
  it('copes with no exam result', () => {
    const t = tutorShareText({ subject: 'Maths', date })
    expect(t).toContain('My revision')
    expect(t).not.toContain('Mark:')
  })
  it('clips very long answers', () => {
    const t = tutorShareText({ exam: { question: 'Q', answer: 'x'.repeat(5000), awarded: 1, available: 6 }, date })
    expect(t.length).toBeLessThan(2000)
    expect(t).toContain('…')
  })
})

describe('writtenShareText', () => {
  it('shows a mark of zero', () => {
    const t = writtenShareText({ question: 'Q', answer: 'A', marks: 0, total: 4, date })
    expect(t).toContain('Mark: 0/4')
  })
})

describe('whatsappUrl', () => {
  it('encodes the text for click-to-chat', () => {
    expect(whatsappUrl('a b&c')).toBe('https://wa.me/?text=a%20b%26c')
  })
})

describe('quizShareText', () => {
  it('shows the score and what he got wrong', () => {
    const t = quizShareText({ name: 'James', subject: 'Biology', title: 'Quiz 2', score: 8, total: 10, date,
      wrong: [{ question: 'Which organelle...?', yourAnswer: 'B Ribosome', correctAnswer: 'A Mitochondrion' }] })
    expect(t).toContain('Biology › Quiz 2')
    expect(t).toContain('Score: 8/10 (80%)')
    expect(t).toContain('Me: B Ribosome · Answer: A Mitochondrion')
  })
  it('celebrates full marks', () => {
    expect(quizShareText({ score: 5, total: 5, date })).toContain('Full marks')
  })
})
