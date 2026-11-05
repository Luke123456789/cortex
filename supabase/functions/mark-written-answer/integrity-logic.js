// Signs that a written answer wasn't the student's own typing: paste and
// typing records from the answer page, a phrase check for AI-style writing,
// and the markers' own AI judgement. Flags are for a parent to look at; they
// never change the mark. Pure; tested in test/integrity-logic.test.js.

export const PASTE_RATIO_FLAG = 0.25 // a quarter or more of the answer pasted
export const LARGE_PASTE_CHARS = 150 // one paste this long is worth a look
export const MAX_PLAUSIBLE_CPM = 450 // characters per active minute, typed
const UNEXPLAINED_SLACK = 40 // chars of text not accounted for by typing/pasting

// Pasted or dropped-in text is never accepted, and an answer must come with
// the answer page's typing record. Returns an error for the student, or null.
export function pasteRejection(telemetry) {
  if (!telemetry || typeof telemetry !== 'object') {
    return 'Type your answer on the answer page in Cortex, then submit it from there.'
  }
  if (Number(telemetry.pastedChars) > 0 || Number(telemetry.droppedChars) > 0 || Number(telemetry.pasteCount) > 0) {
    return "Pasted text isn't allowed. Clear the answer box and type your answer yourself."
  }
  return null
}

const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0)

// telemetry (from the answer page):
//   { typedChars, pastedChars, pasteCount, largestPaste, droppedChars,
//     activeMs, tabAways, inputEvents }
export function assessTyping(telemetry, answer) {
  const length = (answer || '').length
  if (!telemetry || typeof telemetry !== 'object') {
    return { recorded: false, flags: ['No typing record was sent with this answer (it may not have been typed on the answer page).'] }
  }
  const t = {
    typedChars: num(telemetry.typedChars),
    pastedChars: num(telemetry.pastedChars),
    pasteCount: num(telemetry.pasteCount),
    largestPaste: num(telemetry.largestPaste),
    droppedChars: num(telemetry.droppedChars),
    activeMs: num(telemetry.activeMs),
    tabAways: num(telemetry.tabAways),
  }
  const flags = []
  const pasteRatio = length ? Math.min(1, (t.pastedChars + t.droppedChars) / length) : 0
  if (pasteRatio >= PASTE_RATIO_FLAG) {
    flags.push(`${Math.round(pasteRatio * 100)}% of the answer was pasted or dropped in (${t.pasteCount} paste${t.pasteCount === 1 ? '' : 's'}).`)
  } else if (t.largestPaste >= LARGE_PASTE_CHARS) {
    flags.push(`One paste of ${t.largestPaste} characters.`)
  }
  const unexplained = length - (t.typedChars + t.pastedChars + t.droppedChars)
  if (unexplained > Math.max(UNEXPLAINED_SLACK, length * 0.2)) {
    flags.push(`About ${unexplained} characters appeared without being typed or pasted (e.g. dictation, autofill or a changed page).`)
  }
  const minutes = t.activeMs / 60000
  const cpm = minutes > 0 ? Math.round(t.typedChars / minutes) : null
  if (cpm != null && t.typedChars > 200 && cpm > MAX_PLAUSIBLE_CPM) {
    flags.push(`Typed unusually fast (${cpm} characters a minute).`)
  }
  return { recorded: true, ...t, pasteRatio: Math.round(pasteRatio * 100) / 100, cpm, flags }
}

// Words and habits typical of AI-generated text but unusual in a GCSE
// pupil's typed answer. A hit is a hint, not proof.
const AI_PHRASES = [
  /\bdelve[sd]?\b/i, /\btapestry\b/i, /\btestament to\b/i, /\bmultifaceted\b/i, /\bunderscores?\b/i,
  /\bnuanced\b/i, /\bin the realm of\b/i, /\bit is (important|worth) (to note|noting)\b/i,
  /\bserves as a (stark |powerful |poignant )?reminder\b/i, /\bintricate(ly)?\b/i, /\bpivotal\b/i,
  /\bjuxtaposition\b.*\bjuxtaposition\b/is, /\bin summary\b/i, /\boverall, /i,
]

export function phraseSignals(answer) {
  const text = answer || ''
  const signals = []
  const hits = AI_PHRASES.filter((re) => re.test(text)).map((re) => text.match(re)[0].toLowerCase())
  if (hits.length >= 2) signals.push(`Uses phrases common in AI writing: ${[...new Set(hits)].slice(0, 5).map((h) => `"${h}"`).join(', ')}.`)
  if (/(^|\n)\s*#{1,6}\s|\*\*[^*]+\*\*/.test(text)) signals.push('Contains Markdown formatting (headings or **bold**), typical of copied AI output.')
  if ((text.match(/(^|\n)\s*([-*•]|\d+\.)\s+\S/g) || []).length >= 3) signals.push('Written as a bulleted or numbered list.')
  if ((text.match(/—/g) || []).length >= 3) signals.push('Several em dashes (—), which are hard to type on a normal keyboard.')
  if (/[“”‘’]/.test(text) && !/["']/.test(text)) signals.push('Uses curly “smart” quotes throughout, which usually come from pasted text.')
  return signals
}

const RANK = { low: 0, medium: 1, high: 2 }

// The two markings' AI judgements: take the higher (be cautious, it only
// raises a flag for a parent).
export function combineAi(runs) {
  const valid = runs.filter((r) => r && RANK[r.aiLikelihood] != null)
  if (!valid.length) return { likelihood: null, signals: [] }
  const top = valid.reduce((a, b) => (RANK[b.aiLikelihood] > RANK[a.aiLikelihood] ? b : a))
  const signals = [...new Set(valid.flatMap((r) => r.aiSignals || []))].slice(0, 6)
  return { likelihood: top.aiLikelihood, signals }
}

export function buildIntegrity({ telemetry, answer, runs }) {
  const typing = assessTyping(telemetry, answer)
  const phrases = phraseSignals(answer)
  const ai = combineAi(runs)
  const reasons = [...typing.flags]
  let aiFlagged = false
  if (ai.likelihood === 'high' || (ai.likelihood === 'medium' && phrases.length > 0)) {
    reasons.push(`Possibly AI-written (${ai.likelihood} likelihood).`)
    aiFlagged = true
  } else if (phrases.length >= 2) {
    reasons.push('Some signs of AI-style writing.')
    aiFlagged = true
  }
  return {
    typing,
    ai: { ...ai, phraseSignals: phrases },
    flagged: reasons.length > 0,
    aiFlagged,
    typingFlagged: typing.flags.length > 0,
    reasons,
  }
}
