// Checks a multiple-choice question for answer give-aways: the correct option
// being much longer than the others, absolute words that mark the wrong
// options ("always", "only ever", "no effect"), hedging that only the correct
// option uses ("may", "could"), and throwaway options. Pure; tested in
// test/option-quality.test.js and used to gate rewritten distractors.

export const LETTERS = ['A', 'B', 'C', 'D']

const ABSOLUTE = /\b(always|never|only|no effect|nothing|unrelated|none|completely|entirely|every|all|impossible|cannot ever)\b/i
const HEDGE = /\b(may|might|could|can|likely|probably|suggests?|perhaps|tends? to|often|partly)\b/i
const THROWAWAY = /\b(no (dramatic |real |particular )?(significance|effect|purpose|meaning|importance|reason)|has no role|is irrelevant|none of the (above|these)|all of the (above|these)|for no reason)\b/i

export function optionsOf(q) {
  return { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }
}

// Is a wrong option's length close enough to the correct one's?
export function lengthOk(wrongLen, correctLen) {
  if (correctLen <= 20) return Math.abs(wrongLen - correctLen) <= 10
  return wrongLen >= correctLen * 0.7 && wrongLen <= correctLen * 1.35
}

export function checkQuestion(options, correct) {
  const c = String(correct).toUpperCase()
  const right = options[c] || ''
  const wrong = LETTERS.filter((l) => l !== c).map((l) => options[l] || '')
  const lens = LETTERS.map((l) => (options[l] || '').length)
  const maxLen = Math.max(...lens)
  const issues = []

  const correctIsLongest = right.length === maxLen && lens.filter((n) => n === maxLen).length === 1
  const avgWrong = wrong.reduce((n, w) => n + w.length, 0) / wrong.length
  const ratio = avgWrong ? right.length / avgWrong : 1
  const unbalanced = wrong.filter((w) => !lengthOk(w.length, right.length)).length
  if (unbalanced) issues.push(`${unbalanced} wrong option${unbalanced === 1 ? '' : 's'} not close in length to the correct one`)

  const absoluteWrong = wrong.filter((w) => ABSOLUTE.test(w)).length
  if (absoluteWrong && !ABSOLUTE.test(right)) issues.push('absolute words only in wrong options')

  if (HEDGE.test(right) && !wrong.some((w) => HEDGE.test(w))) issues.push('only the correct option hedges')

  if (wrong.some((w) => THROWAWAY.test(w))) issues.push('a throwaway option')

  const norm = (s) => s.trim().toLowerCase()
  if (new Set(LETTERS.map((l) => norm(options[l] || ''))).size < 4) issues.push('duplicate options')
  if (LETTERS.some((l) => !(options[l] || '').trim())) issues.push('empty option')

  return { ok: issues.length === 0, issues, correctIsLongest, ratio: Math.round(ratio * 100) / 100 }
}

// Batch summary: how often the correct answer is the longest (fair is ~25%).
export function summarise(rows) {
  const checks = rows.map((r) => checkQuestion(r.options, r.correct))
  const n = checks.length || 1
  return {
    questions: checks.length,
    correctIsLongestPct: Math.round((100 * checks.filter((c) => c.correctIsLongest).length) / n),
    avgRatio: Math.round((100 * checks.reduce((s, c) => s + c.ratio, 0)) / n) / 100,
    withIssuesPct: Math.round((100 * checks.filter((c) => !c.ok).length) / n),
  }
}
