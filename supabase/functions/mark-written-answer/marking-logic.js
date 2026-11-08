// Pure logic for mark-written-answer: the marking prompt and tool, reading the
// model's answer, combining two independent markings, and the reward.
// No I/O; unit-tested in test/marking-logic.test.js.

export const MAX_ANSWER_CHARS = 20000
// Two markings further apart than this (in marks) are flagged for a parent.
export function reviewTolerance(totalMarks) {
  return Math.max(1, Math.round(totalMarks * 0.1))
}

export function validateAnswer(text) {
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed) return { ok: false, error: 'Write an answer before submitting.' }
  if (trimmed.length > MAX_ANSWER_CHARS) return { ok: false, error: 'That answer is too long to mark. Keep it under 20,000 characters.' }
  return { ok: true, text: trimmed }
}

const COMMAND_WORDS = {
  state: 'give a short answer, no explanation needed',
  describe: 'say what happens or what something is like; no reasons needed',
  explain: 'give reasons: say how or why, linking each point with "because" or "so"',
  evaluate: 'weigh up both sides and finish with a judgement',
  compare: 'give similarities and differences, referring to both things throughout',
  justify: 'give reasons or evidence to support a choice',
  calculate: 'work out a number, showing your working',
  analyse: 'pick out details and explain how they create meaning or effects',
  determine: 'work out the answer from the information given, showing how',
  explore: 'develop ideas in depth, considering different interpretations',
}

export function commandWordHint(word) {
  return COMMAND_WORDS[word] || null
}

export function buildMarkingPrompt({ question, scheme, subjectName, examBoard, answer }) {
  const contentMarks = question.total_marks - (scheme.spag_marks || 0)
  const s = scheme.scheme || {}
  const schemeText = scheme.marking_style === 'points'
    ? [
        `Points-based mark scheme (maximum ${s.max ?? contentMarks} marks, one mark per creditable point):`,
        ...(s.points || []).map((p, i) => `${i + 1}. ${p}`),
        s.guidance ? `Guidance: ${s.guidance}` : '',
      ].join('\n')
    : [
        `Levels-based mark scheme (content marks out of ${contentMarks}):`,
        ...(s.levels || []).map((l) => `Level ${l.level} (${l.marks[0]}-${l.marks[1]} marks): ${l.descriptor}`),
        'Indicative content (not a checklist; credit any valid point):',
        ...(s.indicative || []).map((p) => `- ${p}`),
        s.guidance ? `Guidance: ${s.guidance}` : '',
        s.spag ? `Spelling, punctuation and grammar: ${s.spag}` : '',
      ].join('\n')

  const aoText = Object.entries(scheme.ao_marks || {}).map(([ao, m]) => `${ao}: ${m}`).join(', ')

  return `You are an experienced ${examBoard || 'GCSE'} examiner marking a GCSE ${subjectName || ''} answer. Mark it exactly as you would in a real exam.

Question (${question.total_marks} marks, command word "${question.command_word}"):
${question.question_text}

${schemeText}

Assessment objectives for this question: ${aoText || 'not split'}.

Student's answer (between the tags):
<answer>
${answer}
</answer>

How to mark:
- Mark only what is written. Credit correct points in any wording; don't credit vague, incorrect or contradicted points.
- Don't reward length for its own sake, and don't penalise spelling except in the spelling, punctuation and grammar marks.
- For a points-based scheme, award one mark per creditable point up to the maximum.
- For a levels-based scheme, decide the best-fit level first, then the mark within the level.
${scheme.spag_marks ? `- Award spelling, punctuation and grammar separately, out of ${scheme.spag_marks}.` : '- There are no separate spelling, punctuation and grammar marks.'}
- Check whether the answer did what the command word asks (${question.command_word}: ${commandWordHint(question.command_word) || 'as the question asks'}).
- Feedback is for the student (a GCSE pupil): plain, specific and encouraging. Say "you".
- The student can't see the mark scheme, so never refer to it by number ("point 3", "Level 2 descriptor"); say what the point is.
- "missing" lists only things that would have earned more marks. If the answer got full marks, leave it empty.
- Separately, judge whether the answer looks AI-generated rather than written by a GCSE pupil (e.g. vocabulary or polish well beyond the pupil's level, generic essay structure, no personal voice or slips, headings or bullet points in an essay, American spelling). This does NOT affect the mark. Most genuine answers are "low"; use "high" only when several signs point the same way. Never mention this in the student feedback.`
}

export function markingTool(question, scheme) {
  const contentMarks = question.total_marks - (scheme.spag_marks || 0)
  return {
    name: 'submit_mark',
    description: 'Submit the mark and feedback for this answer',
    input_schema: {
      type: 'object',
      properties: {
        content_marks: { type: 'integer', minimum: 0, maximum: contentMarks, description: `Marks for content, 0-${contentMarks}` },
        spag_marks: { type: 'integer', minimum: 0, maximum: scheme.spag_marks || 0, description: 'Spelling, punctuation and grammar marks (0 if not assessed)' },
        level: { type: ['integer', 'null'], description: 'Level reached for a levels-based scheme, otherwise null' },
        ao_awarded: { type: 'object', additionalProperties: { type: 'integer' }, description: 'Marks by assessment objective, e.g. {"AO1": 2, "AO2": 1}' },
        credited: { type: 'array', items: { type: 'string' }, description: 'What earned marks, briefly, in terms of what the student wrote' },
        missing: { type: 'array', items: { type: 'string' }, description: 'What was missing or wrong that would have earned more marks; empty if full marks' },
        next_step: { type: 'string', description: 'One concrete thing to do to gain the next mark next time' },
        command_word_satisfied: { type: 'boolean', description: 'Did the answer do what the command word asks?' },
        summary: { type: 'string', description: 'Two sentences of overall feedback for the student' },
        ai_likelihood: { type: 'string', enum: ['low', 'medium', 'high'], description: 'How likely the answer is AI-generated (for the parent only; does not affect the mark)' },
        ai_signals: { type: 'array', items: { type: 'string' }, description: 'The specific signs behind ai_likelihood (empty if low)' },
      },
      required: ['content_marks', 'spag_marks', 'level', 'ao_awarded', 'credited', 'missing', 'next_step', 'command_word_satisfied', 'summary', 'ai_likelihood', 'ai_signals'],
    },
  }
}

const clampInt = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v) || 0)))
// Drops a stray unmatched quote the model sometimes leaves at the end.
export function cleanText(v) {
  if (typeof v !== 'string') return ''
  let t = v.trim()
  if (t.endsWith('"') && (t.match(/"/g) || []).length % 2 === 1) t = t.slice(0, -1).trim()
  return t
}
const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map(cleanText) : [])

// Reads one marking from the model response; null if malformed.
export function extractMark(anthropicResponseJson, question, scheme) {
  const block = anthropicResponseJson?.content?.find?.((c) => c.type === 'tool_use' && c.name === 'submit_mark')
  const m = block?.input
  if (!m || m.content_marks == null) return null
  const spagMax = scheme.spag_marks || 0
  const content = clampInt(m.content_marks, 0, question.total_marks - spagMax)
  const spag = clampInt(m.spag_marks, 0, spagMax)
  const aoAwarded = {}
  for (const [ao, v] of Object.entries(m.ao_awarded || {})) {
    const cap = (scheme.ao_marks || {})[ao]
    if (cap != null) aoAwarded[ao] = clampInt(v, 0, cap)
  }
  const marks = content + spag
  return {
    marks,
    contentMarks: content,
    spagMarks: spag,
    level: Number.isInteger(m.level) ? m.level : null,
    aoAwarded,
    credited: strings(m.credited),
    // Nothing is "missing" from a full-mark answer, whatever the model says.
    missing: marks >= question.total_marks ? [] : strings(m.missing),
    nextStep: cleanText(m.next_step),
    commandWordSatisfied: m.command_word_satisfied === true,
    summary: cleanText(m.summary),
    aiLikelihood: ['low', 'medium', 'high'].includes(m.ai_likelihood) ? m.ai_likelihood : null,
    aiSignals: strings(m.ai_signals),
  }
}

// Two independent markings -> one result. The mark is the mean rounded
// down; the feedback comes from the marking closest to it (the lower one on
// a tie). Disagreement beyond the tolerance is flagged for a parent.
export function reconcile(a, b, totalMarks) {
  if (!a && !b) return null
  if (!a || !b) return { ...(a || b), needsReview: true, runs: [a, b] }
  const marks = Math.floor((a.marks + b.marks) / 2)
  const chosen = Math.abs(a.marks - marks) <= Math.abs(b.marks - marks) ? a : b
  return {
    ...chosen,
    marks,
    needsReview: Math.abs(a.marks - b.marks) > reviewTolerance(totalMarks),
    runs: [a, b],
  }
}

// 1 minute per mark, plus 5 for 70% or more. Practice students earn nothing.
// 1 minute per mark, plus 5 for 70%+ on a single written question. Questions
// in a mock paper pay 1 per mark only (no per-question bonus).
export function computeMinutes(marks, totalMarks, isPractice = false, { bonus = true } = {}) {
  if (isPractice || totalMarks <= 0) return 0
  return marks + (bonus && marks / totalMarks >= 0.7 ? 5 : 0)
}
