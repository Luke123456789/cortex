// Plain-text summaries of a student's own work, for sending to family on
// WhatsApp. Pure builders (tested in test/share.test.js) plus a small helper
// that uses the phone's share sheet where there is one, and WhatsApp's
// click-to-chat link otherwise.

const MAX_ANSWER_CHARS = 1500

function clip(text, max = MAX_ANSWER_CHARS) {
  const t = (text ?? '').trim()
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t
}

const lines = (...parts) => parts.filter((p) => p !== null && p !== undefined && p !== '').join('\n')

export function tutorShareText({ name, subject, topic, lesson, exam, feedback, answers, date = new Date() }) {
  const who = name || 'My'
  const when = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return lines(
    `📚 ${name ? `${who}'s` : 'My'} revision — ${when}`,
    `Tutor session: ${[subject, topic, lesson].filter(Boolean).join(' › ')}`,
    answers ? `Questions answered properly: ${answers}` : null,
    '',
    exam?.question ? `Exam question:\n${exam.question}` : null,
    exam?.answer ? `\nMy answer:\n${clip(exam.answer)}` : null,
    exam ? `\nMark: ${exam.awarded}/${exam.available}` : null,
    feedback ? `\nFeedback: ${feedback}` : null,
  )
}

export function writtenShareText({ name, subject, question, answer, marks, total, summary, nextStep, date = new Date() }) {
  const when = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return lines(
    `📝 ${name ? `${name}'s` : 'My'} exam practice — ${when}`,
    subject ? `Subject: ${subject}` : null,
    '',
    question ? `Question:\n${clip(question, 800)}` : null,
    answer ? `\nMy answer:\n${clip(answer)}` : null,
    marks != null ? `\nMark: ${marks}/${total}` : null,
    summary ? `\nFeedback: ${summary}` : null,
    nextStep ? `Next time: ${nextStep}` : null,
  )
}

export function whatsappUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

// Returns 'shared', 'cancelled' or 'opened'.
export async function shareToWhatsApp(text) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
      // Share sheet unavailable for this content: fall back to the link.
    }
  }
  window.open(whatsappUrl(text), '_blank', 'noopener')
  return 'opened'
}

// wrong: [{ question, yourAnswer, correctAnswer }]
export function quizShareText({ name, subject, title, score, total, wrong = [], date = new Date() }) {
  const when = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const out = [
    `✅ ${name ? `${name}'s` : 'My'} quiz — ${when}`,
    [subject, title].filter(Boolean).join(' › '),
    `Score: ${score}/${total}${total ? ` (${Math.round((100 * score) / total)}%)` : ''}`,
  ]
  if (wrong.length) {
    out.push('', 'Got wrong:')
    for (const w of wrong.slice(0, 8)) {
      out.push(`• ${clip(w.question, 160)}`, `  Me: ${w.yourAnswer || '—'} · Answer: ${w.correctAnswer}`)
    }
    if (wrong.length > 8) out.push(`…and ${wrong.length - 8} more`)
  } else if (total) {
    out.push('', 'Full marks! 🎉')
  }
  return lines(...out)
}
