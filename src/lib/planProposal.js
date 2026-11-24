// Turns a weekly plan's targets into specific work for the parent to approve.
// Pure; tested in test/planProposal.test.js.
//
// Rules:
// - Counts are split across the focus subjects in proportion to their hours.
// - Weakest topics first (lowest written-answer marks), untouched topics next,
//   strong topics last; within that, work he hasn't done before comes first.
// - Picks rotate through topics so a week doesn't pile onto one topic.
// - Nothing already set and still pending is proposed again.

const TYPES = ['tutor_session', 'written_test', 'mock_paper', 'quiz']
export const PLAN_TYPE_LABELS = { tutor_session: 'Tutor session', written_test: 'Written answer', mock_paper: 'Exam paper', quiz: 'Quiz' }

// Time estimates, in minutes, from exam timing: about 1.5 minutes per mark
// for a written answer (reading, planning, writing), a tutor session at
// about 20 minutes, 45 seconds per quiz question, a paper at its real length.
export const TUTOR_MINUTES = 20
export const writtenMinutes = (marks) => Math.max(3, Math.round((marks || 1) * 1.5))
export const quizMinutes = (questions) => Math.max(3, Math.round((questions || 10) * 0.75))

// Estimate for an assignment row (already-set work), using the catalog.
export function estimateAssignment(a, catalog) {
  if (a.type === 'tutor_session') return TUTOR_MINUTES
  if (a.type === 'written_test') return writtenMinutes(catalog.examQuestions.find((q) => q.id === a.exam_question_id)?.total_marks)
  if (a.type === 'quiz') return quizMinutes(catalog.quizzes.find((q) => q.id === a.quiz_id)?.question_count)
  if (a.type === 'mock_paper') return catalog.papers.find((p) => p.ref === a.paper_ref)?.duration_minutes || 60
  return 0
}

// Planned minutes per subject. items: [{ subject_id, est }].
export function plannedBySubject(items) {
  const out = {}
  for (const i of items) if (i.subject_id) out[i.subject_id] = (out[i.subject_id] ?? 0) + (i.est ?? 0)
  return out
}

// Per-subject comparison of planned time against the hours target.
// Within 10 minutes counts as on target.
export function timeCheck(subjectMinutes, planned) {
  return Object.entries(subjectMinutes).filter(([, m]) => m > 0).map(([id, target]) => {
    const p = planned[id] ?? 0
    const gap = target - p
    return { subject_id: id, target, planned: p, gap, status: gap > 10 ? 'short' : gap < -10 ? 'over' : 'ok' }
  })
}

// Top up each subject that's short of its hours: written answers first
// (weakest topics), then tutor sessions, until within 10 minutes or out of
// content. existing: already-set items [{ key, subject_id, est }].
export function fillToHours(proposal, subjectMinutes, ctx, existing = []) {
  const items = proposal.items.slice()
  const inUse = new Set([...existing, ...items].map((i) => i.key))
  const planned = plannedBySubject([...existing, ...items])
  const added = {}
  for (const [sid, target] of Object.entries(subjectMinutes)) {
    if (!(target > 0)) continue
    for (const type of ['written_test', 'tutor_session']) {
      if ((planned[sid] ?? 0) >= target - 10) break
      for (const c of candidatesFor(type, sid, ctx)) {
        if ((planned[sid] ?? 0) >= target - 10) break
        if (inUse.has(c.key)) continue
        // Don't overshoot by a lot with one big question.
        if ((planned[sid] ?? 0) + c.est > target + 15 && type === 'written_test') continue
        items.push(c)
        inUse.add(c.key)
        planned[sid] = (planned[sid] ?? 0) + c.est
        added[sid] = (added[sid] ?? 0) + 1
      }
    }
  }
  return { ...proposal, items, added }
}

// Split n across keys in proportion to weights (largest remainder).
export function apportion(n, weights) {
  const keys = Object.keys(weights).filter((k) => weights[k] > 0)
  const total = keys.reduce((s, k) => s + weights[k], 0)
  const out = Object.fromEntries(keys.map((k) => [k, 0]))
  if (!n || !total) return out
  const raw = keys.map((k) => ({ k, exact: (n * weights[k]) / total }))
  let used = 0
  for (const r of raw) { out[r.k] = Math.floor(r.exact); used += out[r.k] }
  raw.sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)) || weights[b.k] - weights[a.k])
  for (let i = 0; used < n; i = (i + 1) % raw.length) { out[raw[i].k]++; used++ }
  return out
}

// Topic order for a subject: weak (scored, lowest first), then unscored, then strong.
export function rankTopics(topics, topicScores) {
  const scored = topics.filter((t) => topicScores.has(t.id)).sort((a, b) => topicScores.get(a.id) - topicScores.get(b.id))
  const weak = scored.filter((t) => topicScores.get(t.id) < 70)
  const strong = scored.filter((t) => topicScores.get(t.id) >= 70)
  const unscored = topics.filter((t) => !topicScores.has(t.id))
  return [...weak, ...unscored, ...strong]
}

// Interleave per-topic candidate lists: first of each topic, then second, ...
function roundRobin(lists) {
  const out = []
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i])
  return out
}

// Candidates (best first) for one type in one subject.
export function candidatesFor(type, subjectId, ctx) {
  const { catalog, history } = ctx
  const topics = rankTopics(catalog.topics.filter((t) => t.subject_id === subjectId), history.topicScores)
  const topicIds = new Set(topics.map((t) => t.id))
  const byTopic = (rows, topicOf) => topics.map((t) => rows.filter((r) => topicOf(r) === t.id))
  const subtopicTopic = new Map(catalog.subtopics.map((s) => [s.id, s.topic_id]))
  const subtopicName = new Map(catalog.subtopics.map((s) => [s.id, s.name]))

  if (type === 'tutor_session') {
    const rows = catalog.subtopics
      .filter((s) => topicIds.has(s.topic_id) && !history.pendingSubtopics.has(s.id))
      .map((s) => ({ s, last: history.tutoredAt.get(s.id) ?? 0 }))
      .sort((a, b) => a.last - b.last) // never tutored (0) first, then longest ago
    return roundRobin(byTopic(rows, (r) => r.s.topic_id)).map(({ s }) => ({
      type, key: `tutor:${s.id}`, subject_id: subjectId, topic_id: s.topic_id, subtopic_id: s.id,
      title: `${s.name} tutor session`, est: TUTOR_MINUTES,
    }))
  }

  if (type === 'written_test') {
    const rows = catalog.examQuestions
      .filter((q) => topicIds.has(q.topic_id) && !history.attemptedQuestions.has(q.id) && !history.pendingQuestions.has(q.id))
      // Bigger questions first: they're where the marks are and what he avoids.
      .sort((a, b) => (b.total_marks >= 4) - (a.total_marks >= 4) || b.total_marks - a.total_marks)
    return roundRobin(byTopic(rows, (q) => q.topic_id)).map((q) => ({
      type, key: `written:${q.id}`, subject_id: subjectId, topic_id: q.topic_id, subtopic_id: q.subtopic_id ?? null, exam_question_id: q.id,
      title: `${subtopicName.get(q.subtopic_id) ?? catalog.topics.find((t) => t.id === q.topic_id)?.name ?? 'Written answer'}: written answer (${q.total_marks} marks)`,
      est: writtenMinutes(q.total_marks),
    }))
  }

  if (type === 'mock_paper') {
    const papers = catalog.papers
      .filter((p) => p.subject_id === subjectId && !history.donePapers.has(p.ref) && !history.pendingPapers.has(p.ref))
      .sort((a, b) => (a.topic_id ? 1 : 0) - (b.topic_id ? 1 : 0) || a.title.localeCompare(b.title)) // full mocks before topic practice
    return papers.map((p) => ({ type, key: `paper:${p.ref}`, subject_id: subjectId, topic_id: p.topic_id ?? null, paper_ref: p.ref, title: p.title, est: p.duration_minutes || 60 }))
  }

  if (type === 'quiz') {
    const rows = catalog.quizzes
      .filter((q) => topicIds.has(q.topic_id) && !history.pendingQuizzes.has(q.id))
      .map((q) => ({ q, last: history.quizzedAt.get(q.id) ?? 0 }))
      .sort((a, b) => a.last - b.last)
    return roundRobin(byTopic(rows, (r) => r.q.topic_id)).map(({ q }) => ({
      type, key: `quiz:${q.id}`, subject_id: subjectId, topic_id: q.topic_id, subtopic_id: q.subtopic_id ?? null, quiz_id: q.id, title: q.title,
      est: quizMinutes(q.question_count),
    }))
  }
  return []
}

// targets: { subjectMinutes: {id: min}, tutor_sessions, exam_questions, papers, quizzes }
// existing: items already approved for this plan (counted against targets).
// Returns { items, shortfall: {type: n}, pools } — pools hold the unused
// candidates per type+subject for swapping.
export function proposeWork(targets, ctx, existing = []) {
  const counts = { tutor_session: targets.tutor_sessions ?? 0, written_test: targets.exam_questions ?? 0, mock_paper: targets.papers ?? 0, quiz: targets.quizzes ?? 0 }
  const weights = targets.subjectMinutes ?? {}
  const taken = new Set(existing.map((e) => e.key).filter(Boolean))
  const items = []
  const pools = {}
  const shortfall = {}

  for (const type of TYPES) {
    const already = existing.filter((e) => e.type === type).length
    const want = Math.max(0, counts[type] - already)
    if (!want) continue
    const split = apportion(want, weights)
    const leftovers = []
    let short = 0
    for (const [subjectId, n] of Object.entries(split)) {
      const cands = candidatesFor(type, subjectId, ctx).filter((c) => !taken.has(c.key))
      const pick = cands.slice(0, n)
      pick.forEach((c) => taken.add(c.key))
      items.push(...pick)
      pools[`${type}:${subjectId}`] = cands.slice(n)
      short += n - pick.length
      leftovers.push(...cands.slice(n))
    }
    // A subject that ran out: fill from the other focus subjects.
    for (const c of leftovers) {
      if (!short) break
      if (taken.has(c.key)) continue
      items.push(c)
      taken.add(c.key)
      const pool = pools[`${type}:${c.subject_id}`]
      pools[`${type}:${c.subject_id}`] = pool.filter((p) => p.key !== c.key)
      short--
    }
    if (short) shortfall[type] = short
  }
  return { items, shortfall, pools }
}

// Swap an item for the next unused candidate of the same type and subject.
export function swapItem(proposal, key) {
  const idx = proposal.items.findIndex((i) => i.key === key)
  if (idx < 0) return proposal
  const item = proposal.items[idx]
  const poolKey = `${item.type}:${item.subject_id}`
  const inUse = new Set(proposal.items.map((i) => i.key))
  const pool = (proposal.pools[poolKey] ?? []).filter((c) => !inUse.has(c.key))
  if (!pool.length) return proposal
  const [next, ...rest] = pool
  const items = proposal.items.slice()
  items[idx] = next
  return { ...proposal, items, pools: { ...proposal.pools, [poolKey]: [...rest, item] } }
}

export function removeItem(proposal, key) {
  return { ...proposal, items: proposal.items.filter((i) => i.key !== key) }
}

// Sunday 23:59:59 local time for the week starting weekStart ('YYYY-MM-DD').
export function weekDueAt(weekStart) {
  const [y, m, d] = weekStart.split('-').map(Number)
  return new Date(y, m - 1, d + 6, 23, 59, 59)
}

// assignments rows for approved items.
export function toAssignmentRows(items, { studentId, parentId, planId, weekStart, note }) {
  const due = weekDueAt(weekStart).toISOString()
  return items.map((i) => ({
    student_id: studentId,
    assigned_by: parentId,
    plan_id: planId,
    type: i.type,
    title: i.title,
    subject_id: i.subject_id ?? null,
    topic_id: i.type === 'mock_paper' ? null : i.topic_id ?? null,
    subtopic_id: i.subtopic_id ?? null,
    quiz_id: i.quiz_id ?? null,
    exam_question_id: i.exam_question_id ?? null,
    paper_ref: i.paper_ref ?? null,
    due_at: due,
    note: note || null,
  }))
}

// The key an existing assignment row would have had as a proposal item.
export function keyOfAssignment(a) {
  if (a.type === 'tutor_session') return `tutor:${a.subtopic_id}`
  if (a.type === 'written_test') return `written:${a.exam_question_id}`
  if (a.type === 'mock_paper') return `paper:${a.paper_ref}`
  if (a.type === 'quiz') return `quiz:${a.quiz_id}`
  return `other:${a.id}`
}
