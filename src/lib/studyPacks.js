// Study packs: a bundle of work on one topic (tutor session, quiz and written
// question for each subtopic, then an exam practice set). Any pending pack can
// be worked on, in any order. Pure; tested in test/study-packs.test.js.

export const PACK_STEP_LABELS = {
  tutor_session: 'Tutor session',
  quiz: 'Quiz',
  written_test: 'Written question',
  mock_paper: 'Exam practice',
}

export const EXAM_GROUP = 'Exam practice'

// The steps a pack for this topic would contain, in the order to do them:
// for each subtopic a tutor session, its quiz and a written question, then
// the topic's exam practice set. A step with nothing to set (no quiz or
// written question yet) comes back with available: false so the parent can
// see the gap. done/pending flag steps the student has finished before or
// already has waiting.
//
//   catalog: { subtopics, quizzes, examQuestions, papers } (all rows; filtered here)
//   done:    doneIndex() result ({ quiz, written, tutor } Maps) or null
//   assignments: the student's assignments (for pending work and finished papers)
export function buildPackSteps(topic, catalog, done = null, assignments = []) {
  if (!topic) return []
  const pending = assignments.filter((a) => a.status === 'pending')
  const papersDone = new Set(assignments.filter((a) => a.type === 'mock_paper' && a.status === 'completed').map((a) => a.paper_ref))
  const isPending = (pred) => pending.some(pred)
  const steps = []

  for (const st of catalog.subtopics.filter((s) => s.topic_id === topic.id)) {
    steps.push({
      key: `tutor_session:${st.id}`,
      group: st.name,
      type: 'tutor_session',
      available: true,
      detail: 'Learn it with the tutor',
      done: !!done?.tutor.get(st.id),
      pending: isPending((a) => a.type === 'tutor_session' && a.subtopic_id === st.id),
      item: { type: 'tutor_session', title: `${st.name} tutor session`, subtopic_id: st.id },
    })

    const quiz = catalog.quizzes.find((q) => q.subtopic_id === st.id && q.question_count > 0)
    steps.push(quiz
      ? {
          key: `quiz:${quiz.id}`,
          group: st.name,
          type: 'quiz',
          available: true,
          detail: `${quiz.question_count} questions`,
          done: !!done?.quiz.get(quiz.id),
          pending: isPending((a) => a.type === 'quiz' && a.quiz_id === quiz.id),
          item: { type: 'quiz', title: quiz.title, quiz_id: quiz.id, subtopic_id: st.id },
        }
      : { key: `quiz:none:${st.id}`, group: st.name, type: 'quiz', available: false, detail: 'No quiz for this lesson yet' })

    const written = catalog.examQuestions.filter((q) => q.subtopic_id === st.id)
    // Prefer a question they haven't answered yet.
    const question = written.find((q) => !done?.written.get(q.id)) || written[0]
    steps.push(question
      ? {
          key: `written_test:${question.id}`,
          group: st.name,
          type: 'written_test',
          available: true,
          detail: `${capitalise(question.command_word)} · ${question.total_marks} marks`,
          done: !!done?.written.get(question.id),
          pending: isPending((a) => a.type === 'written_test' && a.exam_question_id === question.id),
          item: { type: 'written_test', title: `${st.name}: written answer (${question.total_marks} marks)`, exam_question_id: question.id, subtopic_id: st.id },
        }
      : { key: `written_test:none:${st.id}`, group: st.name, type: 'written_test', available: false, detail: 'No written question for this lesson yet' })
  }

  const topicPapers = catalog.papers.filter((p) => p.topic_id === topic.id)
  const paper = topicPapers.find((p) => !papersDone.has(p.ref)) || topicPapers[0]
  steps.push(paper
    ? {
        key: `mock_paper:${paper.ref}`,
        group: EXAM_GROUP,
        type: 'mock_paper',
        available: true,
        detail: `${paper.total_marks} marks · ${paper.duration_minutes} minutes`,
        done: papersDone.has(paper.ref),
        pending: isPending((a) => a.type === 'mock_paper' && a.paper_ref === paper.ref),
        item: { type: 'mock_paper', title: paper.title, paper_ref: paper.ref },
      }
    : { key: 'mock_paper:none', group: EXAM_GROUP, type: 'mock_paper', available: false, detail: 'No exam practice set for this topic yet' })

  return steps
}

function capitalise(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : ''
}

// Steps grouped for display, keeping their order.
export function groupSteps(steps) {
  const groups = []
  for (const s of steps) {
    const last = groups[groups.length - 1]
    if (last && last.name === s.group) last.steps.push(s)
    else groups.push({ name: s.group, steps: [s] })
  }
  return groups
}

// How far through a pack the student is. items: the pack's assignments.
export function packProgress(items) {
  const live = items.filter((a) => a.status !== 'cancelled').sort((a, b) => (a.pack_position ?? 0) - (b.pack_position ?? 0))
  const doneCount = live.filter((a) => a.status === 'completed').length
  const next = live.find((a) => a.status === 'pending') || null
  return { total: live.length, done: doneCount, next, items: live }
}

const byQueue = (a, b) => (a.queue_position - b.queue_position) || (new Date(a.assigned_at) - new Date(b.assigned_at))

// For each subject, the pending pack to work on now: the lowest in the queue.
// Returns Map subject_id -> pack.
export function currentPacks(packs) {
  const current = new Map()
  for (const p of packs.filter((x) => x.status === 'pending').sort(byQueue)) {
    if (!current.has(p.subject_id)) current.set(p.subject_id, p)
  }
  return current
}

// The student's work list with each pending pack shown once instead of its
// pending steps. Finished steps stay (they still count as done this week);
// packs that are finished or cancelled add nothing. Each pack entry carries
// its progress. Every pending pack can be worked on: there is no longer a
// one-pack-per-subject queue (isCurrent is always true, waitingFor null; both
// are kept so callers don't need to change).
export function collapsePacks(assignments, packs) {
  const pendingPacks = packs.filter((p) => p.status === 'pending')
  const pendingIds = new Set(pendingPacks.map((p) => p.id))
  const out = assignments.filter((a) => !(a.pack_id && pendingIds.has(a.pack_id) && a.status === 'pending'))
  for (const p of pendingPacks) {
    const progress = packProgress(assignments.filter((a) => a.pack_id === p.id))
    if (!progress.next) continue
    out.push({
      id: `pack:${p.id}`,
      packId: p.id,
      type: 'study_pack',
      isPack: true,
      title: p.title,
      note: p.note,
      status: 'pending',
      due_at: p.due_at,
      assigned_at: p.assigned_at,
      subject_id: p.subject_id,
      topic_id: p.topic_id,
      progress,
      isCurrent: true,
      waitingFor: null,
    })
  }
  return out
}
