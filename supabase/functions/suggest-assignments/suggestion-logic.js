// Pure logic for suggest-assignments: per-subject/per-topic activity stats,
// the candidate list the model may choose from, the prompt, and validation of
// the model's answer. No I/O here, so it is unit-tested in test/.

const DAY = 24 * 60 * 60 * 1000

export const MIN_SUGGESTIONS = 3
export const MAX_SUGGESTIONS = 8

function daysSince(iso, now) {
  if (!iso) return null
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY)
}

function latest(a, b) {
  if (!a) return b
  if (!b) return a
  return new Date(a) > new Date(b) ? a : b
}

// Activity per topic and per subject, from completed quiz sessions and
// completed tutor sessions.
export function buildStats({ subjects, topics, subtopics, quizSessions, tutorSessions, now = new Date() }) {
  const topicById = new Map(topics.map((t) => [t.id, t]))
  const subtopicById = new Map(subtopics.map((s) => [s.id, s]))

  const topicStats = new Map(
    topics.map((t) => [t.id, {
      topicId: t.id,
      subjectId: t.subject_id,
      name: t.name,
      quizzes: 0,
      questions: 0,
      correct: 0,
      tutorSessions: 0,
      tutorMinutes: 0,
      lastActive: null,
    }]),
  )

  for (const q of quizSessions) {
    const s = topicStats.get(q.topic_id)
    if (!s || !q.completed_at) continue
    s.quizzes += 1
    s.questions += q.question_count || 0
    s.correct += q.score || 0
    s.lastActive = latest(s.lastActive, q.completed_at)
  }

  for (const t of tutorSessions) {
    if (!t.completed_at) continue
    const sub = subtopicById.get(t.subtopic_id)
    const s = sub && topicStats.get(sub.topic_id)
    if (!s) continue
    s.tutorSessions += 1
    s.tutorMinutes += t.minutes_earned || 0
    s.lastActive = latest(s.lastActive, t.completed_at)
  }

  const subjectStats = subjects.map((subj) => {
    const mine = [...topicStats.values()].filter((s) => s.subjectId === subj.id)
    const questions = mine.reduce((n, s) => n + s.questions, 0)
    const correct = mine.reduce((n, s) => n + s.correct, 0)
    const lastActive = mine.reduce((d, s) => latest(d, s.lastActive), null)
    return {
      subjectId: subj.id,
      name: subj.name,
      examBoard: subj.exam_board || null,
      topics: mine.length,
      topicsTouched: mine.filter((s) => s.quizzes > 0 || s.tutorSessions > 0).length,
      quizzes: mine.reduce((n, s) => n + s.quizzes, 0),
      tutorSessions: mine.reduce((n, s) => n + s.tutorSessions, 0),
      accuracy: questions > 0 ? Math.round((correct / questions) * 100) : null,
      daysSinceActive: daysSince(lastActive, now),
    }
  })

  for (const s of topicStats.values()) {
    s.accuracy = s.questions > 0 ? Math.round((s.correct / s.questions) * 100) : null
    s.daysSinceActive = daysSince(s.lastActive, now)
  }

  return { subjectStats, topicStats, topicById }
}

// What the model may suggest: for each topic (that has a playable quiz), the
// first quiz not yet completed (or the least recently done one), and up to two
// lessons without a completed tutor session. Excludes anything already pending
// and anything under an active lock. Each candidate gets a short ref (q1, t1)
// that the model answers with; ids never go through the model.
export function buildCandidates({ subjects, topics, subtopics, quizzes, quizSessions, tutorSessions, pendingAssignments, locks = [], now = new Date() }) {
  const subjectById = new Map(subjects.map((s) => [s.id, s]))
  const playableTopicIds = new Set(quizzes.filter((q) => (q.question_count || 0) > 0).map((q) => q.topic_id))
  const pendingQuizIds = new Set(pendingAssignments.filter((a) => a.quiz_id).map((a) => a.quiz_id))
  const pendingSubtopicIds = new Set(pendingAssignments.filter((a) => a.subtopic_id).map((a) => a.subtopic_id))

  const isLocked = (subjectId, topicId) => locks.some((l) =>
    new Date(l.locked_until).getTime() > now.getTime() &&
    l.subject_id === subjectId && (!l.topic_id || l.topic_id === topicId))

  const lastQuizDone = new Map()
  for (const qs of quizSessions) {
    if (!qs.completed_at || !qs.quiz_id) continue
    lastQuizDone.set(qs.quiz_id, latest(lastQuizDone.get(qs.quiz_id), qs.completed_at))
  }
  const tutoredSubtopics = new Set(tutorSessions.filter((t) => t.completed_at).map((t) => t.subtopic_id))

  const candidates = []
  let q = 0
  let t = 0
  for (const topic of topics) {
    if (!playableTopicIds.has(topic.id) || isLocked(topic.subject_id, topic.id)) continue
    const subject = subjectById.get(topic.subject_id)
    const base = { subjectId: topic.subject_id, topicId: topic.id, subjectName: subject?.name ?? null, topicName: topic.name }

    const topicQuizzes = quizzes
      .filter((x) => x.topic_id === topic.id && (x.question_count || 0) > 0 && !pendingQuizIds.has(x.id))
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    const notDone = topicQuizzes.find((x) => !lastQuizDone.has(x.id))
    const oldest = [...topicQuizzes].sort((a, b) => new Date(lastQuizDone.get(a.id)) - new Date(lastQuizDone.get(b.id)))[0]
    const quiz = notDone || oldest
    if (quiz) {
      q += 1
      candidates.push({
        ref: `q${q}`, type: 'quiz', quizId: quiz.id, title: quiz.title, ...base,
        questionCount: quiz.question_count, previouslyDone: lastQuizDone.has(quiz.id),
      })
    }

    const lessons = subtopics
      .filter((s) => s.topic_id === topic.id && !tutoredSubtopics.has(s.id) && !pendingSubtopicIds.has(s.id))
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .slice(0, 2)
    for (const lesson of lessons) {
      t += 1
      candidates.push({ ref: `t${t}`, type: 'tutor_session', subtopicId: lesson.id, title: `${lesson.name} tutor session`, lessonName: lesson.name, ...base })
    }
  }
  return candidates
}

export function hasCandidates(candidates) {
  return candidates.length > 0
}

export function buildSuggestionPrompt({ studentName, subjectStats, topicStats, candidates, pendingAssignments }) {
  const subjectLines = subjectStats.map((s) =>
    `- ${s.name}${s.examBoard ? ` (${s.examBoard})` : ''}: ${s.topicsTouched}/${s.topics} topics touched, ` +
    `${s.quizzes} quizzes, ${s.tutorSessions} tutor sessions, ` +
    `quiz accuracy ${s.accuracy == null ? 'n/a' : `${s.accuracy}%`}, ` +
    `last active ${s.daysSinceActive == null ? 'never' : `${s.daysSinceActive} days ago`}`)

  const topicLines = [...topicStats.values()]
    .filter((s) => s.quizzes > 0 || s.tutorSessions > 0)
    .map((s) =>
      `- ${s.name}: ${s.quizzes} quizzes, accuracy ${s.accuracy == null ? 'n/a' : `${s.accuracy}%`}, ` +
      `${s.tutorSessions} tutor sessions, last active ${s.daysSinceActive} days ago`)

  const candidateLines = candidates.map((c) =>
    `${c.ref} | ${c.type === 'quiz' ? 'Quiz' : 'Tutor session'} | ${c.subjectName} > ${c.topicName} | ` +
    `${c.type === 'quiz' ? `${c.title} (${c.questionCount} questions)${c.previouslyDone ? ', done before' : ''}` : c.lessonName}`)

  const pendingLines = pendingAssignments.map((a) => `- ${a.title}`)

  return `You are helping a parent decide what GCSE revision work to assign to ${studentName}.

Activity by subject:
${subjectLines.join('\n')}

Topics with any activity (topics not listed have never been touched):
${topicLines.length ? topicLines.join('\n') : '- none'}

Already assigned and not yet done:
${pendingLines.length ? pendingLines.join('\n') : '- nothing'}

Candidate work you may suggest (ref | type | subject > topic | item):
${candidateLines.join('\n')}

Choose ${MIN_SUGGESTIONS}-${MAX_SUGGESTIONS} items from the candidates that best compensate for:
1. Avoidance: subjects or topics with little or no activity, or none for a long time.
2. Struggle: topics with noticeably lower quiz accuracy than the student's usual level.
Spread the picks across subjects where it makes sense, mix quizzes and tutor sessions, and don't pick two items for the same thing. Only use refs from the list.
For each pick, give a one-sentence reason addressed to the parent that cites the evidence (e.g. "No Chemistry at all so far" or "62% on Bonding, well below his usual 93%"). Also give a two-sentence overview of the pattern you see.`
}

export const SUGGESTION_TOOL = {
  name: 'submit_suggestions',
  description: 'Submit suggested assignments for the parent to review',
  input_schema: {
    type: 'object',
    properties: {
      overview: { type: 'string', description: 'Two sentences on what the student is avoiding or struggling with' },
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ref: { type: 'string', description: 'A ref from the candidate list, e.g. q3 or t12' },
            reason: { type: 'string', description: 'One sentence for the parent citing the evidence' },
            focus: { type: 'string', enum: ['avoided', 'struggling', 'consolidate'] },
          },
          required: ['ref', 'reason', 'focus'],
        },
      },
    },
    required: ['overview', 'suggestions'],
  },
}

// Maps the model's refs back to real candidates. Unknown refs and duplicates
// are dropped, so nothing the model invents can reach the client.
export function extractSuggestions(anthropicResponseJson, candidates) {
  const block = anthropicResponseJson?.content?.find?.((c) => c.type === 'tool_use' && c.name === SUGGESTION_TOOL.name)
  const input = block?.input
  if (!input || !Array.isArray(input.suggestions)) return null

  const byRef = new Map(candidates.map((c) => [c.ref, c]))
  const seen = new Set()
  const suggestions = []
  for (const s of input.suggestions) {
    const c = byRef.get(typeof s?.ref === 'string' ? s.ref.trim() : '')
    if (!c || seen.has(c.ref)) continue
    seen.add(c.ref)
    suggestions.push({
      type: c.type,
      quizId: c.quizId ?? null,
      subtopicId: c.subtopicId ?? null,
      subjectId: c.subjectId,
      topicId: c.topicId,
      subjectName: c.subjectName,
      topicName: c.topicName,
      title: c.title,
      reason: typeof s.reason === 'string' ? s.reason : '',
      focus: ['avoided', 'struggling', 'consolidate'].includes(s.focus) ? s.focus : 'consolidate',
    })
    if (suggestions.length >= MAX_SUGGESTIONS) break
  }
  return { overview: typeof input.overview === 'string' ? input.overview : '', suggestions }
}
