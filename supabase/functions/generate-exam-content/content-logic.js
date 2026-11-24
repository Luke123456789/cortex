// Pure logic for generate-exam-content: exam board facts, prompts, tool
// schemas and validation. No Deno APIs, so Vitest can import it
// (test/content-logic.test.js).

// What each of James's papers looks like. Topic coverage is described in words;
// the model picks from the subject's real topic list and we validate the names.
export const BOARDS = {
  Biology: {
    board: 'AQA GCSE Biology (8461), Higher tier',
    slug: 'aqa-8461-h',
    tariffs: 'Mostly 1-4 mark questions (give, describe, explain, calculate), with some 6-mark extended responses (levels of response) and required-practical questions.',
    papers: {
      1: { title: 'Biology Higher Paper 1', duration: 105, marks: 100, calculator: true, covers: 'Cell biology; Organisation; Infection and response; Bioenergetics (spec 4.1-4.4)' },
      2: { title: 'Biology Higher Paper 2', duration: 105, marks: 100, calculator: true, covers: 'Homeostasis and response; Inheritance, variation and evolution; Ecology (spec 4.5-4.7)' },
    },
  },
  Chemistry: {
    board: 'AQA GCSE Chemistry (8462), Higher tier',
    slug: 'aqa-8462-h',
    tariffs: 'Mostly 1-4 mark questions including calculations with working, with some 6-mark extended responses (levels of response) and required-practical questions.',
    papers: {
      1: { title: 'Chemistry Higher Paper 1', duration: 105, marks: 100, calculator: true, covers: 'Atomic structure and the periodic table; Bonding; Quantitative chemistry; Chemical changes; Energy changes (C1-C5)' },
      2: { title: 'Chemistry Higher Paper 2', duration: 105, marks: 100, calculator: true, covers: 'Rates and equilibrium; Organic chemistry; Chemical analysis; Chemistry of the atmosphere; Using resources (C6-C10)' },
    },
  },
  Physics: {
    board: 'AQA GCSE Physics (8463), Higher tier',
    slug: 'aqa-8463-h',
    tariffs: 'Mostly 1-4 mark questions including calculations (recall or given equations, show working, units), with some 6-mark extended responses (levels of response) and required-practical questions.',
    papers: {
      1: { title: 'Physics Higher Paper 1', duration: 105, marks: 100, calculator: true, covers: 'Energy; Electricity; Particle model of matter; Atomic structure (P1-P4)' },
      2: { title: 'Physics Higher Paper 2', duration: 105, marks: 100, calculator: true, covers: 'Forces; Waves; Magnetism and electromagnetism; Space physics (P5-P8)' },
    },
  },
  Maths: {
    board: 'Pearson Edexcel GCSE (9-1) Mathematics (1MA1), Higher tier',
    slug: 'edexcel-1ma1-h',
    tariffs: '1-5 mark questions, mostly method-and-answer. Mark schemes use M (method), A (accuracy) and B (independent) marks, written into the points.',
    papers: {
      1: { title: 'Maths Higher Paper 1 (non-calculator)', duration: 90, marks: 80, calculator: false, covers: 'All content areas; no calculator, so numbers must work by hand' },
      2: { title: 'Maths Higher Paper 2 (calculator)', duration: 90, marks: 80, calculator: true, covers: 'All content areas' },
      3: { title: 'Maths Higher Paper 3 (calculator)', duration: 90, marks: 80, calculator: true, covers: 'All content areas' },
    },
  },
  Economics: {
    board: 'AQA GCSE Economics (8136)',
    slug: 'aqa-8136',
    tariffs: 'Multiple choice (1), define/state (1-2), calculate (2), explain (2-4), analyse (6, levels) and evaluate/assess (9, levels). Many questions use a short data extract, table or scenario.',
    papers: {
      1: { title: 'Economics Paper 1: How markets work', duration: 105, marks: 80, calculator: true, covers: 'Economic foundations, resource allocation, supply and demand, elasticity, costs/revenue/profit, market structures, labour market, market failure (3.1)' },
      2: { title: 'Economics Paper 2: How the economy works', duration: 105, marks: 80, calculator: true, covers: 'National economy, government objectives, policy tools, international trade, exchange rates, money and banking (3.2)' },
    },
  },
  Business: {
    board: 'WJEC Eduqas GCSE (9-1) Business (C710)',
    slug: 'eduqas-c710',
    tariffs: 'Short-answer (1-4), calculations, explain (3-6), analyse and evaluate (6-8, levels) questions. Questions are set in a business context; Component 2 is built on case-study data.',
    papers: {
      1: { title: 'Business Component 1: Business Dynamics', duration: 120, marks: 100, calculator: true, covers: 'The whole specification, through short scenarios' },
      2: { title: 'Business Component 2: Business Considerations', duration: 90, marks: 60, calculator: true, covers: 'The whole specification, every question based on one or two case studies about real-feeling (invented) businesses' },
    },
  },
  'English Language': {
    board: 'AQA GCSE English Language (8700)',
    slug: 'aqa-8700',
    tariffs: 'Fixed paper structure (see the paper description). Reading questions are levels-marked against the source; writing is levels-marked for content and organisation with separate technical accuracy.',
    sourced: true,
    papers: {
      1: {
        title: 'English Language Paper 1: Explorations in Creative Reading and Writing', duration: 105, marks: 80, calculator: false,
        covers: 'Section A Reading, one literature fiction extract (Source A, 20th or 21st century, about 45-60 lines). Q1 list four things (4), Q2 language analysis of a given section (8), Q3 structure across the whole source (8), Q4 evaluate a statement about part of the source (20). Section B Writing: Q5 descriptive or narrative writing, with a choice of two tasks, one linked to an image described in words (40: 24 content and organisation + 16 technical accuracy)',
      },
      2: {
        title: "English Language Paper 2: Writers' Viewpoints and Perspectives", duration: 105, marks: 80, calculator: false,
        covers: 'Section A Reading, two linked non-fiction sources (Source A 20th/21st century, Source B 19th century) on the same topic. Q1 choose four true statements from Source A (4), Q2 summarise differences using both sources (8), Q3 language analysis of Source B (12), Q4 compare writers\' perspectives using both sources (16). Section B Writing: Q5 write to present a viewpoint linked to the topic (40: 24 content and organisation + 16 technical accuracy)',
      },
    },
  },
  'English Literature': {
    board: 'AQA GCSE English Literature (8702)',
    slug: 'aqa-8702',
    tariffs: 'Essay questions marked by levels (30 marks, plus 4 SPaG on Macbeth and An Inspector Calls). Shorter skills questions (4-12) are fine for practice.',
    sourced: true,
    papers: {
      1: { title: 'English Literature Paper 1: Shakespeare and the 19th-century novel', duration: 105, marks: 64, calculator: false, covers: 'Section A Macbeth: one extract-based essay (30 + 4 SPaG). Section B A Christmas Carol: one extract-based essay (30)' },
      2: { title: 'English Literature Paper 2: Modern texts and poetry', duration: 135, marks: 96, calculator: false, covers: 'Section A An Inspector Calls: one essay, no extract (30 + 4 SPaG). Section B Power and Conflict anthology: compare a named poem with one other of the student\'s choice (30). Section C Unseen poetry: 27.1 one unseen poem (24), 27.2 compare it with a second unseen poem (8)' },
    },
  },
  'Physical Education': {
    board: 'OCR GCSE (9-1) Physical Education (J587)',
    slug: 'ocr-j587',
    tariffs: 'Section A multiple choice (1 mark each), then short answers (1-4) applied to sporting examples, and one 6-mark extended response per paper (levels, with * indicating quality of extended response).',
    papers: {
      1: { title: 'PE Paper 1: Physical factors affecting performance', duration: 60, marks: 60, calculator: false, covers: 'Applied anatomy and physiology; Physical training (1.1-1.2)' },
      2: { title: 'PE Paper 2: Socio-cultural issues and sports psychology', duration: 60, marks: 60, calculator: false, covers: 'Socio-cultural influences; Sports psychology; Health, fitness and well-being (2.1-2.3)' },
    },
  },
}

export const COPYRIGHT_RULES = `Copyright: never reproduce text from real exam papers, mark schemes or textbooks; write every question yourself in the board's style. For literature still in copyright (An Inspector Calls; Power and Conflict poems by living or recent poets) never quote more than a few words: name the poem or scene instead of printing it. Shakespeare and Dickens are public domain: you may print a short extract, but only words you are certain are exact; if unsure, write the question without an extract. Unseen poems and reading sources must be your own original writing (a 19th-century source should be your own pastiche, labelled "written in the style of a 19th-century ..."). Images cannot be shown, so describe any image or diagram in words.`

const SCHEME_PROPS = {
  marking_style: { type: 'string', enum: ['points', 'levels'], description: 'points for questions marked by creditworthy points; levels for extended responses' },
  points: { type: 'array', items: { type: 'string' }, description: 'REQUIRED for points style (empty array for levels style): each creditworthy point is worth 1 mark; at least as many points as content marks (alternatives can be in one point). For multi-part questions prefix each with its part, e.g. "(b) ..."' },
  levels: {
    type: 'array',
    description: 'REQUIRED for levels style (empty array for points style): highest level first; mark bands contiguous from 1 up to the content marks',
    items: {
      type: 'object',
      properties: { level: { type: 'integer' }, marks: { type: 'array', items: { type: 'integer' }, description: '[lowest, highest]' }, descriptor: { type: 'string' } },
      required: ['level', 'marks', 'descriptor'],
    },
  },
  indicative: { type: 'array', items: { type: 'string' }, description: 'REQUIRED for levels style (empty array for points style): indicative content an examiner would credit (at least 4 items)' },
  guidance: { type: 'string', description: 'Examiner guidance: what to accept or reject, how marks are split' },
  spag_marks: { type: 'integer', minimum: 0, maximum: 16, description: 'Separate spelling, punctuation and grammar / technical accuracy marks included in total_marks (0 if none)' },
  spag: { type: 'string', description: 'If spag_marks > 0: the SPaG / technical accuracy bands' },
  ao_marks: { type: 'object', additionalProperties: { type: 'integer' }, description: 'Marks per assessment objective, e.g. {"AO1": 2, "AO2": 2}' },
}

const QUESTION_ITEM = {
  type: 'object',
  properties: {
    subtopic: { type: 'string', description: 'Exactly one of the subtopic names given' },
    command_word: { type: 'string', enum: ['state', 'describe', 'explain', 'evaluate', 'compare', 'justify', 'calculate', 'analyse', 'determine', 'explore'], description: 'The closest of these to the question\'s command word (give/name/identify = state; outline = describe; suggest = explain; assess/discuss/how far = evaluate; work out/find = calculate; extended writing = explore)' },
    total_marks: { type: 'integer', minimum: 1, maximum: 40 },
    difficulty: { type: 'string', enum: ['foundation', 'higher'] },
    question_text: { type: 'string', description: 'The full question as printed, plain text. Multi-part questions use (a), (b) ... with the marks for each part in brackets.' },
    ...SCHEME_PROPS,
  },
  // points, levels and indicative are all required (empty arrays when unused):
  // left optional, the model often drops the mark scheme entirely.
  required: ['subtopic', 'command_word', 'total_marks', 'difficulty', 'question_text', 'marking_style', 'points', 'levels', 'indicative', 'guidance', 'spag_marks', 'ao_marks'],
}

export const QUESTIONS_TOOL = {
  name: 'submit_questions',
  description: 'Submit the new exam questions with their mark schemes',
  input_schema: { type: 'object', properties: { questions: { type: 'array', items: QUESTION_ITEM } }, required: ['questions'] },
}

export const BLUEPRINT_TOOL = {
  name: 'submit_blueprint',
  description: 'Submit the blueprint for a full mock exam paper',
  input_schema: {
    type: 'object',
    properties: {
      instructions: { type: 'string', description: 'Instructions to candidates printed at the top of the paper' },
      sources: {
        type: 'array',
        description: 'Only for papers built on shared reading material (sources, unseen poems, case studies, data extracts). Your own original writing.',
        items: {
          type: 'object',
          properties: { label: { type: 'string', description: 'e.g. "Source A", "Case study", "Poem 1"' }, intro: { type: 'string' }, text: { type: 'string' } },
          required: ['label', 'text'],
        },
      },
      slots: {
        type: 'array',
        description: 'The questions in order. Marks across slots must add up to the paper total.',
        items: {
          type: 'object',
          properties: {
            number: { type: 'integer' },
            topic: { type: 'string', description: 'Exactly one of the topic names given' },
            total_marks: { type: 'integer', minimum: 1, maximum: 40 },
            theme: { type: 'string', description: 'What this question is about and its parts, in one or two sentences, so questions don\'t overlap' },
            sources: { type: 'array', items: { type: 'string' }, description: 'Labels of the sources this question uses (printed with it)' },
          },
          required: ['number', 'topic', 'total_marks', 'theme'],
        },
      },
    },
    required: ['instructions', 'slots'],
  },
}

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

// The standard GCSE SPaG bands, used when a question has SPaG marks but the
// model left the bands out.
export const DEFAULT_SPAG = 'High performance: spelling and punctuation consistently accurate, grammar used to control meaning, a wide range of specialist terms used precisely (top marks). Intermediate performance: considerable accuracy, general control of meaning, a good range of specialist terms. Threshold performance: reasonable accuracy, no errors that significantly hinder meaning, a limited range of specialist terms (1 mark). No marks: nothing written, or errors that severely hinder meaning.'

// Occasionally a tool call returns an array field as a JSON string. Parse
// those back into arrays.
export function normaliseToolInput(input) {
  if (!input || typeof input !== 'object') return input
  const out = { ...input }
  for (const k of ['questions', 'sources', 'slots']) {
    if (typeof out[k] === 'string') {
      try { out[k] = JSON.parse(out[k]) } catch { out[k] = [] }
    }
    if (out[k] != null && !Array.isArray(out[k])) out[k] = []
  }
  return out
}

// fm_exam_questions.command_word only allows these (a database check).
export const COMMAND_WORDS = ['state', 'describe', 'explain', 'evaluate', 'compare', 'justify', 'calculate', 'analyse', 'determine', 'explore']
const COMMAND_ALIASES = {
  give: 'state', name: 'state', identify: 'state', define: 'state', list: 'state', label: 'state', choose: 'state', select: 'state', recall: 'state', write: 'explore',
  outline: 'describe', summarise: 'describe', summarize: 'describe', discuss: 'evaluate', assess: 'evaluate', 'to what extent': 'evaluate',
  suggest: 'explain', why: 'explain', how: 'explain', analyze: 'analyse', examine: 'analyse', interpret: 'analyse',
  work: 'calculate', find: 'calculate', solve: 'calculate', show: 'calculate', estimate: 'calculate', simplify: 'calculate', expand: 'calculate', factorise: 'calculate', factorize: 'calculate', prove: 'justify', recommend: 'justify',
  plot: 'determine', draw: 'determine', sketch: 'determine', complete: 'determine', predict: 'determine', measure: 'determine', use: 'determine', contrast: 'compare',
}

export function normaliseCommandWord(word) {
  const w = norm(word)
  if (COMMAND_WORDS.includes(w)) return w
  const first = w.split(/[^a-z]+/)[0]
  if (COMMAND_WORDS.includes(first)) return first
  return COMMAND_ALIASES[w] || COMMAND_ALIASES[first] || 'explain'
}

// Checks a generated question and turns it into the rows we store. Returns
// { ok: true, row } or { ok: false, reason }.
export function validateQuestion(q, subtopics) {
  if (!q || typeof q !== 'object') return { ok: false, reason: 'not an object' }
  const text = String(q.question_text ?? '').trim()
  if (text.length < 25) return { ok: false, reason: 'question too short' }
  let total = Number(q.total_marks)
  if (!Number.isInteger(total) || total < 1 || total > 40) return { ok: false, reason: 'bad total_marks' }
  const spag = Number.isInteger(q.spag_marks) ? q.spag_marks : 0
  if (spag < 0 || spag >= total) return { ok: false, reason: 'bad spag_marks' }
  // A common slip: total_marks given without the SPaG marks (30 for a 30 + 4
  // essay) while the bands run to 30. Treat the bands as the content marks.
  const topBand = Math.max(0, ...((q.levels ?? []).map((l) => Number(l?.marks?.[1]) || 0)))
  if (q.marking_style === 'levels' && spag > 0 && topBand === total && total + spag <= 40) total += spag
  const content = total - spag
  const sub = subtopics ? subtopics.find((s) => norm(s.name) === norm(q.subtopic)) : null
  if (subtopics && !sub) return { ok: false, reason: `unknown subtopic "${q.subtopic}"` }

  let scheme
  if (q.marking_style === 'points') {
    const points = (q.points ?? []).map((p) => String(p).trim()).filter(Boolean)
    // Usually one point per mark, but a point can carry 2 marks ("(b) correct
    // method and answer"), so require at least 60% as many points as marks.
    if (points.length < Math.ceil(content * 0.6)) return { ok: false, reason: `only ${points.length} points for ${content} marks` }
    scheme = { max: content, points }
  } else if (q.marking_style === 'levels') {
    const levels = (q.levels ?? [])
      .map((l) => ({ level: Number(l.level), marks: (l.marks ?? []).map(Number), descriptor: String(l.descriptor ?? '').trim() }))
      .filter((l) => l.marks.length === 2 && l.descriptor && l.marks[1] > 0) // drop a "0 marks" band
      .map((l) => (l.marks[0] === 0 ? { ...l, marks: [1, l.marks[1]] } : l))
      .sort((a, b) => b.marks[1] - a.marks[1])
    if (levels.length < 2) return { ok: false, reason: 'fewer than 2 levels' }
    if (levels[0].marks[1] !== content) return { ok: false, reason: `top band ${levels[0].marks[1]} != ${content}` }
    for (let i = 0; i < levels.length; i++) {
      const [lo, hi] = levels[i].marks
      if (lo > hi) return { ok: false, reason: 'inverted band' }
      const below = levels[i + 1]
      if (below && below.marks[1] !== lo - 1) return { ok: false, reason: 'bands not contiguous' }
      if (!below && lo !== 1) return { ok: false, reason: 'bottom band must start at 1' }
    }
    const indicative = (q.indicative ?? []).map((p) => String(p).trim()).filter(Boolean)
    if (indicative.length < 3) return { ok: false, reason: 'too little indicative content' }
    scheme = { levels, indicative }
  } else {
    return { ok: false, reason: 'bad marking_style' }
  }
  if (q.guidance) scheme.guidance = String(q.guidance)
  if (spag > 0) scheme.spag = q.spag ? String(q.spag) : DEFAULT_SPAG

  const ao = {}
  for (const [k, v] of Object.entries(q.ao_marks ?? {})) {
    if (/^AO\d$/.test(k) && Number.isInteger(v) && v > 0) ao[k] = v
  }

  return {
    ok: true,
    row: {
      subtopic_id: sub?.id ?? null,
      spec_ref: sub?.spec_ref ?? null,
      question_text: text,
      command_word: normaliseCommandWord(q.command_word),
      total_marks: total,
      difficulty: q.difficulty === 'higher' ? 'higher' : 'foundation',
      marking_style: q.marking_style,
      scheme,
      ao_marks: ao,
      spag_marks: spag,
    },
  }
}

// Checks a paper blueprint against the subject's topics. Fixes numbering and
// recomputes the total from the slots.
export function validateBlueprint(bp, topics) {
  if (!bp || !Array.isArray(bp.slots) || bp.slots.length === 0) return { ok: false, reason: 'no slots' }
  const sourceLabels = new Set((bp.sources ?? []).map((s) => s.label))
  const slots = []
  for (const s of bp.slots) {
    const topic = topics.find((t) => norm(t.name) === norm(s.topic))
    if (!topic) return { ok: false, reason: `unknown topic "${s.topic}"` }
    const marks = Number(s.total_marks)
    if (!Number.isInteger(marks) || marks < 1 || marks > 40) return { ok: false, reason: 'bad slot marks' }
    const sources = (s.sources ?? []).filter((l) => sourceLabels.has(l))
    slots.push({ number: slots.length + 1, topic_id: topic.id, topic: topic.name, total_marks: marks, theme: String(s.theme ?? ''), sources })
  }
  if (slots.length > 30) return { ok: false, reason: 'too many slots' }
  return {
    ok: true,
    plan: {
      instructions: String(bp.instructions ?? '').trim() || 'Answer all the questions.',
      sources: (bp.sources ?? []).filter((s) => s.text).map((s) => ({ label: s.label, intro: s.intro ?? '', text: s.text })),
      slots,
      total: slots.reduce((n, s) => n + s.total_marks, 0),
    },
  }
}

// The printed question for a paper slot: its sources, then the question.
export function withSources(questionText, slot, plan) {
  const used = (plan.sources ?? []).filter((s) => slot.sources?.includes(s.label))
  if (used.length === 0) return questionText
  const block = used.map((s) => `${s.label}${s.intro ? ` — ${s.intro}` : ''}\n\n${s.text}`).join('\n\n———\n\n')
  return `${block}\n\n———\n\n${questionText}`
}

export function questionsPrompt({ subject, board, topic, subtopics, existing, count }) {
  return `You are a senior ${board.board} examiner writing new practice exam questions for a UK GCSE student.

Topic: ${topic.name}${topic.spec_ref ? ` (spec ${topic.spec_ref})` : ''}
Subtopics (use these exact names): ${subtopics.map((s) => `"${s.name}"${s.spec_ref ? ` [${s.spec_ref}]` : ''}`).join('; ')}

Write ${count} new standalone exam questions for this topic, each with a full mark scheme.
- Typical question styles for this paper: ${board.tariffs}
- Spread them across different subtopics, command words and mark tariffs; include at least one question worth 4 or more marks and roughly one in three at higher difficulty.
- Phrase each exactly as it would appear on the ${board.board} paper, with the command word and realistic contexts, data or scenarios. Give any data the student needs in the question. Calculations must work out and the mark scheme must show the method and answer.
- Each question must stand alone (no "Figure 1" unless you describe it fully in words).
- Mark schemes must be precise enough for an examiner to mark consistently: points style lists one creditworthy point per mark (alternatives in the same point), levels style gives contiguous bands and indicative content.
- Do not repeat or closely paraphrase these existing questions:
${existing.length ? existing.map((e) => `  - ${e}`).join('\n') : '  (none yet)'}

${COPYRIGHT_RULES}

Call submit_questions with exactly ${count} questions.`
}

export function blueprintPrompt({ board, paper, component, topics, mockNumber }) {
  return `You are a senior ${board.board} examiner designing an original full mock exam paper.

Paper: ${paper.title} (component ${component}), ${paper.duration} minutes, ${paper.marks} marks, ${paper.calculator ? 'calculator allowed' : 'no calculator'}.
Content and structure: ${paper.covers}
This is mock number ${mockNumber}; make it different in contexts and emphasis from a typical first mock.

Topics in the app (each question slot must use one of these exact names): ${topics.map((t) => `"${t.name}"`).join('; ')}

Plan the paper as a list of question slots in exam order that mirrors the real paper's structure, sections and mark allocations, adding up to exactly ${paper.marks} marks. A slot is one numbered question; science, maths, economics, business and PE questions are usually multi-part (a), (b), (c) and worth 4-12 marks in total. For each slot give the topic, its marks and a one or two sentence theme listing the parts.
${board.sourced || /case stud|data extract|source/i.test(paper.covers) ? `If the paper is built on reading material (sources, unseen poems, case studies or data extracts), write that material now in "sources" as your own original writing at full exam length, and list which sources each slot uses.` : 'This paper has no shared sources; leave "sources" empty.'}

${COPYRIGHT_RULES}

Call submit_blueprint.`
}

export function slotsPrompt({ board, paper, plan, slots }) {
  const sourceText = (plan.sources ?? []).filter((s) => slots.some((sl) => sl.sources?.includes(s.label)))
  return `You are a senior ${board.board} examiner writing questions for an original full mock paper: ${paper.title}.

The whole paper (so questions don't overlap):
${plan.slots.map((s) => `${s.number}. [${s.topic}, ${s.total_marks} marks] ${s.theme}`).join('\n')}
${sourceText.length ? `\nShared material (it will be printed above the question automatically; refer to it by label, don't reprint it):\n${sourceText.map((s) => `${s.label}${s.intro ? ` — ${s.intro}` : ''}:\n${s.text}`).join('\n\n')}\n` : ''}
Now write question${slots.length > 1 ? 's' : ''} ${slots.map((s) => s.number).join(', ')} in full, each with its mark scheme.
- Each question's total_marks must equal its slot's marks; show the marks for each part in brackets.
- Phrase them exactly as on the ${board.board} paper. Give all data needed; calculations must work out.
- Use the topic name as "subtopic" (it is checked against the topic, not a subtopic, for paper questions).

${COPYRIGHT_RULES}

Call submit_questions with ${slots.length} question${slots.length > 1 ? 's' : ''}, in order.`
}

// Which components to write for a subject, given the mocks it already has.
export function nextComponents(existingComponents, available, needed) {
  const counts = new Map(available.map((c) => [c, 0]))
  for (const c of existingComponents) if (counts.has(c)) counts.set(c, counts.get(c) + 1)
  const out = []
  for (let i = 0; i < needed; i++) {
    const [c] = [...counts.entries()].sort((a, b) => a[1] - b[1] || a[0] - b[0])[0]
    out.push(c)
    counts.set(c, counts.get(c) + 1)
  }
  return out
}
