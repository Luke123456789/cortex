// Pure logic for rewrite-distractors: the prompt that drafts new wrong
// answers, the prompt that independently answers the rewritten question, and
// slotting the new wrong answers around the unchanged correct one.
// Tested in test/rewrite-logic.test.js.
import { LETTERS } from './option-quality.js'

export function lengthBand(correctText) {
  const n = correctText.length
  if (n <= 20) return [Math.max(3, n - 8), n + 8]
  return [Math.round(n * 0.8), Math.round(n * 1.2)]
}

export function buildRewritePrompt({ subject, examBoard, topic, subtopic, question, correctText, oldWrong, feedback }) {
  const [lo, hi] = lengthBand(correctText)
  return `You write multiple-choice questions for GCSE ${subject}${examBoard ? ` (${examBoard})` : ''} revision.

Topic: ${topic || 'n/a'}${subtopic ? ` > ${subtopic}` : ''}
Question: ${question}
Correct answer (do not change it): ${correctText}
Current wrong answers (too easy to rule out): ${oldWrong.map((w) => `"${w}"`).join('; ')}

Write 3 new wrong answers so a student can't find the right one without knowing the material.
Rules:
- Each must be definitely wrong according to the GCSE specification and the text, but tempting: a misconception, a half-remembered detail, a mix-up with another character/scene/concept, or a plausible but unsupported reading.
- Each must be ${lo}-${hi} characters long (the correct answer is ${correctText.length}), and match the correct answer's style, grammar and level of detail. If the correct answer gives a reason ("..., showing that..."), so must each wrong answer.
- If the correct answer hedges ("may", "could", "suggests"), the wrong answers should hedge too. Don't use absolutes ("always", "only", "never", "no effect", "completely") unless the correct answer does.
- No joke or throwaway options, no "none/all of the above", nothing that contradicts the question itself.
- Don't let the correct answer be the only one that repeats key words from the question.
- The 3 wrong answers must differ from each other and from the correct answer.
${feedback ? `\nYour previous attempt had these problems; fix them: ${feedback}` : ''}`
}

export const REWRITE_TOOL = {
  name: 'submit_distractors',
  description: 'Submit three new wrong answers',
  input_schema: {
    type: 'object',
    properties: {
      distractors: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
    },
    required: ['distractors'],
  },
}

export function extractDistractors(json) {
  const input = json?.content?.find?.((c) => c.type === 'tool_use' && c.name === REWRITE_TOOL.name)?.input
  const d = input?.distractors
  if (!Array.isArray(d) || d.length !== 3 || d.some((x) => typeof x !== 'string' || !x.trim())) return null
  return d.map((x) => x.trim())
}

// The correct answer keeps its letter; the new wrong answers fill the others
// in order.
export function placeOptions(correctLetter, correctText, distractors) {
  const out = {}
  let i = 0
  for (const l of LETTERS) out[l] = l === correctLetter ? correctText : distractors[i++]
  return out
}

export function buildVerifyPrompt({ subject, question, options }) {
  return `You are checking a GCSE ${subject} multiple-choice question before it goes to students.

Question: ${question}
${LETTERS.map((l) => `${l}. ${options[l]}`).join('\n')}

Answer it as an expert examiner would. Then say whether any OTHER option could also be defended as correct by a strong student (so the question would be unfair).`
}

export const VERIFY_TOOL = {
  name: 'submit_check',
  description: 'Submit the correct option and any other defensible options',
  input_schema: {
    type: 'object',
    properties: {
      answer: { type: 'string', enum: LETTERS },
      also_defensible: { type: 'array', items: { type: 'string', enum: LETTERS } },
      note: { type: 'string' },
    },
    required: ['answer', 'also_defensible'],
  },
}

export function verdict(json, correctLetter) {
  const input = json?.content?.find?.((c) => c.type === 'tool_use' && c.name === VERIFY_TOOL.name)?.input
  if (!input || !LETTERS.includes(input.answer)) return { ok: false, reason: 'verifier gave no answer' }
  const others = (input.also_defensible || []).filter((l) => l !== correctLetter)
  if (input.answer !== correctLetter) return { ok: false, reason: `verifier chose ${input.answer}`, note: input.note || '' }
  if (others.length) return { ok: false, reason: `also defensible: ${others.join(', ')}`, note: input.note || '' }
  return { ok: true, note: input.note || '' }
}
