#!/usr/bin/env node
// Generates multiple-choice question content for one subject and writes it out
// as a SQL batch (plus a matching rollback file) under supabase/content-batches/.
//
// Nothing is written to the database by this script. Review the batch, then
// apply it as a migration (Supabase MCP apply_migration, or psql) — the same
// way the existing Biology/PE/Chemistry content went in.
//
// Usage:
//   ANTHROPIC_API_KEY=... node scripts/generate-subject.mjs \
//     --spec scripts/specs/aqa-8462-chemistry.json \
//     [--topics C1,C2]        only these topic spec_refs from the spec file
//     [--per-topic 20]        target questions per topic (default 20)
//     [--avoid file.json]     existing question texts to steer away from
//     [--concurrency 3]
//     [--authored file.json]  skip the API: take hand-written questions from
//                             file.json instead (no API key needed). Format:
//                             { "<topic spec_ref>": { "<subtopic spec_ref>": [question, ...] } }
//                             where each question has the submit_questions shape.
//
// Spec file format (topics/subtopics come from the real specification and are
// written by hand, not generated, so the structure can be checked):
//   {
//     "subject": "Chemistry", "exam_board": "AQA", "spec_code": "8462",
//     "topics": [{
//       "name": "...", "spec_ref": "C1", "paper": "Paper 1", "display_order": 1,
//       "existing": false,            // true = topic already in the DB; match by name, don't insert
//       "subtopics": [{ "name": "...", "spec_ref": "4.1.1", "existing": false }]
//     }]
//   }
//
// Pipeline per subtopic:
//   1. generate  — forced tool call (submit_questions) for structured output
//   2. verify    — a separate, fresh call answers each question blind; any
//                  question it gets "wrong" or flags as ambiguous is dropped
//   3. refill    — regenerate to replace dropped questions (bounded rounds)
//   4. dedupe    — content_hash of the normalised question text, within the
//                  batch here and against the whole questions table in the SQL
// Every question row is tagged with one new generation_batch_id; the rollback
// file deletes that batch plus any topics/subtopics/quizzes the batch created.

import { createHash, randomUUID, randomInt } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Same model id as the tutor-chat / tutor-plan edge functions.
export const MODEL = 'claude-sonnet-5'
const API_URL = 'https://api.anthropic.com/v1/messages'
const MAX_REFILL_ROUNDS = 3
const QUIZ_SIZE = 20

// The questions table only allows difficulty foundation|higher and
// question_type recall|applied|calculation, so the finer-grained labels used
// for generation are mapped onto those (existing content is ~62% foundation).
const DIFFICULTY_MAP = { easy: 'foundation', medium: 'foundation', hard: 'higher' }
const SKILL_TO_AO = { recall: 'AO1', application: 'AO2', analysis: 'AO3' }

// ---------- pure helpers (exported for tests) ----------

// Mirrored in SQL by HASH_SQL below so rows inserted before content_hash
// existed are still caught as duplicates.
export function normaliseQuestionText(text) {
  return String(text).replace(/\s+/g, ' ').trim().toLowerCase()
}

export function contentHash(text) {
  return createHash('sha256').update(normaliseQuestionText(text), 'utf8').digest('hex')
}

const HASH_SQL = (col) => `encode(sha256(convert_to(lower(btrim(regexp_replace(${col}, '\\s+', ' ', 'g'))), 'UTF8')), 'hex')`

export function sqlString(value) {
  if (value === null || value === undefined) return 'null'
  return `'${String(value).replace(/'/g, "''")}'`
}

// Place the correct answer at a random letter so there's no positional bias.
export function toLetteredOptions(correct, distractors, rand = (n) => randomInt(n)) {
  const options = [correct, ...distractors]
  for (let i = options.length - 1; i > 0; i--) {
    const j = rand(i + 1)
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  const letter = 'ABCD'[options.indexOf(correct)]
  return { option_a: options[0], option_b: options[1], option_c: options[2], option_d: options[3], correct_option: letter }
}

// Re-letter a batch so each letter is correct roughly equally often (a fair
// shuffle per question can still come out lopsided over 100 questions).
// Moving options around doesn't change which answer is right.
export function balanceLetters(rows, rand = (n) => randomInt(n)) {
  const letters = rows.map((_, i) => 'ABCD'[i % 4])
  for (let i = letters.length - 1; i > 0; i--) {
    const j = rand(i + 1)
    ;[letters[i], letters[j]] = [letters[j], letters[i]]
  }
  rows.forEach((row, i) => {
    const opts = [row.option_a, row.option_b, row.option_c, row.option_d]
    const correct = opts['ABCD'.indexOf(row.correct_option)]
    const others = opts.filter((_, k) => k !== 'ABCD'.indexOf(row.correct_option))
    const target = 'ABCD'.indexOf(letters[i])
    const placed = [...others.slice(0, target), correct, ...others.slice(target)]
    Object.assign(row, { option_a: placed[0], option_b: placed[1], option_c: placed[2], option_d: placed[3], correct_option: letters[i] })
  })
  return rows
}

export function toRow(q, rand) {
  const lettered = toLetteredOptions(q.correct_answer, q.distractors, rand)
  return {
    question_text: q.question.trim(),
    ...lettered,
    explanation: q.explanation.trim(),
    difficulty: DIFFICULTY_MAP[q.difficulty] ?? 'foundation',
    question_type: q.involves_calculation ? 'calculation' : q.skill === 'recall' ? 'recall' : 'applied',
    ao_weighting: SKILL_TO_AO[q.skill] ?? 'AO1',
    content_hash: contentHash(q.question),
    _meta: { difficulty: q.difficulty, skill: q.skill },
  }
}

export function isWellFormed(q) {
  if (!q || typeof q.question !== 'string' || !q.question.trim()) return false
  if (typeof q.correct_answer !== 'string' || !q.correct_answer.trim()) return false
  if (!Array.isArray(q.distractors) || q.distractors.length !== 3) return false
  if (q.distractors.some((d) => typeof d !== 'string' || !d.trim())) return false
  const all = [q.correct_answer, ...q.distractors].map(normaliseQuestionText)
  if (new Set(all).size !== 4) return false
  if (typeof q.explanation !== 'string' || !q.explanation.trim()) return false
  return true
}

// Split a topic's target count across its subtopics as evenly as possible.
export function allocate(total, n) {
  const base = Math.floor(total / n)
  return Array.from({ length: n }, (_, i) => base + (i < total % n ? 1 : 0))
}

// ---------- Anthropic calls ----------

const GENERATE_TOOL = {
  name: 'submit_questions',
  description: 'Submit the multiple-choice questions',
  input_schema: {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            correct_answer: { type: 'string', description: 'The single unambiguously correct option' },
            distractors: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3, description: 'Three plausible but definitely wrong options' },
            explanation: { type: 'string', description: '1-2 sentences on why the answer is right (and, where useful, why a tempting distractor is wrong)' },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
            skill: { type: 'string', enum: ['recall', 'application', 'analysis'] },
            involves_calculation: { type: 'boolean' },
          },
          required: ['question', 'correct_answer', 'distractors', 'explanation', 'difficulty', 'skill', 'involves_calculation'],
        },
      },
    },
    required: ['questions'],
  },
}

const VERIFY_TOOL = {
  name: 'submit_answers',
  description: 'Submit your answer to each question',
  input_schema: {
    type: 'object',
    properties: {
      answers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            index: { type: 'integer' },
            answer: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
            exactly_one_correct: { type: 'boolean', description: 'false if no option, or more than one option, is defensibly correct' },
          },
          required: ['index', 'answer', 'exactly_one_correct'],
        },
      },
    },
    required: ['answers'],
  },
}

async function callTool({ apiKey, prompt, tool, maxTokens }) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
      }),
    })
    if (res.ok) {
      const data = await res.json()
      const block = data.content?.find((b) => b.type === 'tool_use')
      if (!block) throw new Error(`No tool_use block in response (stop_reason=${data.stop_reason})`)
      return block.input
    }
    const body = await res.text()
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      const wait = 2 ** attempt * 2000
      console.warn(`  API ${res.status}, retrying in ${wait / 1000}s`)
      await new Promise((r) => setTimeout(r, wait))
      continue
    }
    throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 500)}`)
  }
}

function generationPrompt({ spec, topic, subtopic, count, avoid }) {
  const board = `${spec.exam_board} GCSE ${spec.subject} (${spec.spec_code})`
  return `You are an experienced ${board} examiner writing multiple-choice revision questions for a GCSE student.

Topic: ${topic.name} (${topic.spec_ref})
Subtopic: ${subtopic.name} (spec ref ${subtopic.spec_ref})
${spec.notes ? `\nContext: ${spec.notes}\n` : ''}${topic.notes ? `\nTopic notes: ${topic.notes}\n` : ''}${subtopic.notes ? `\nSubtopic notes: ${subtopic.notes}\n` : ''}
Write exactly ${count} questions on this subtopic, staying strictly within the ${board} specification content for spec ref ${subtopic.spec_ref}.

Requirements:
- Mix of difficulty: roughly a third each easy, medium and hard.
- Mix of skill: recall (knowing facts/definitions), application (using knowledge in a new context), analysis (interpreting data, evaluating or reasoning through several steps).
- Each question has exactly ONE unambiguously correct answer and three plausible distractors that are definitely wrong — no "all of the above", "none of the above", or options that are partly right.
- Use the terminology, units and conventions of this specification. Calculations must have a single correct numerical answer with units.
- Only test things a multiple-choice question can genuinely test.
- The explanation should teach: why the answer is right, and where helpful why a tempting distractor is wrong.
- Do not repeat or closely paraphrase any of these existing questions:
${avoid.length ? avoid.map((t) => `  - ${t}`).join('\n') : '  (none)'}

Call submit_questions with the questions.`
}

function verificationPrompt({ spec, rows }) {
  const board = `${spec.exam_board} GCSE ${spec.subject} (${spec.spec_code})`
  const list = rows
    .map((r, i) => `Question ${i}:\n${r.question_text}\nA) ${r.option_a}\nB) ${r.option_b}\nC) ${r.option_c}\nD) ${r.option_d}`)
    .join('\n\n')
  return `You are checking ${board} multiple-choice questions before they are given to a student. Answer each one yourself, carefully.

For each question, give the letter of the correct option, and set exactly_one_correct to false if no option is correct or more than one option could reasonably be marked correct under the specification.

${list}

Call submit_answers with an answer for every question index.`
}

async function verify({ apiKey, spec, rows }) {
  if (rows.length === 0) return { kept: [], dropped: [] }
  const { answers } = await callTool({ apiKey, prompt: verificationPrompt({ spec, rows }), tool: VERIFY_TOOL, maxTokens: 2000 })
  const byIndex = new Map((answers ?? []).map((a) => [a.index, a]))
  const kept = []
  const dropped = []
  rows.forEach((row, i) => {
    const a = byIndex.get(i)
    if (!a) dropped.push({ row, reason: 'verifier gave no answer' })
    else if (!a.exactly_one_correct) dropped.push({ row, reason: `verifier flagged ambiguous (chose ${a.answer})` })
    else if (a.answer !== row.correct_option) dropped.push({ row, reason: `verifier chose ${a.answer}, stored ${row.correct_option}` })
    else kept.push(row)
  })
  return { kept, dropped }
}

async function buildSubtopic({ apiKey, spec, topic, subtopic, target, seenHashes, avoidTexts }) {
  const kept = []
  const dropped = []
  for (let round = 0; round <= MAX_REFILL_ROUNDS && kept.length < target; round++) {
    const need = target - kept.length
    const avoid = [...avoidTexts, ...kept.map((r) => r.question_text)]
    const { questions } = await callTool({
      apiKey,
      prompt: generationPrompt({ spec, topic, subtopic, count: need, avoid }),
      tool: GENERATE_TOOL,
      maxTokens: 8000,
    })
    const candidates = []
    for (const q of questions ?? []) {
      if (!isWellFormed(q)) { dropped.push({ row: { question_text: q?.question ?? '(missing)' }, reason: 'malformed' }); continue }
      const row = toRow(q)
      if (seenHashes.has(row.content_hash)) { dropped.push({ row, reason: 'duplicate' }); continue }
      seenHashes.add(row.content_hash)
      candidates.push(row)
    }
    const result = await verify({ apiKey, spec, rows: candidates })
    kept.push(...result.kept.slice(0, target - kept.length))
    dropped.push(...result.dropped)
    console.log(`  ${subtopic.spec_ref} ${subtopic.name}: round ${round + 1} kept ${result.kept.length}/${candidates.length} (total ${kept.length}/${target})`)
  }
  return { kept, dropped }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }))
  return results
}

// ---------- SQL output ----------

export function buildSql({ spec, batchId, topics, source = MODEL }) {
  // IDs and content hashes are created by the database (gen_random_uuid() and
  // HASH_SQL), and topics/subtopics/quizzes are referenced by name, so the file
  // holds nothing random apart from the batch id. That keeps it small enough to
  // apply through the Supabase MCP and easy to review.
  const lines = []
  const subjectId = `(select id from subjects where name = ${sqlString(spec.subject)})`
  const topicRef = (t) => `(select id from topics where subject_id = ${subjectId} and name = ${sqlString(t.name)})`
  const subtopicRef = (t, st) => `(select id from subtopics where topic_id = ${topicRef(t)} and name = ${sqlString(st.name)})`
  const batch = `${sqlString(batchId)}::uuid`

  lines.push(`-- Content batch ${batchId}`)
  lines.push(`-- ${spec.exam_board} ${spec.subject} (${spec.spec_code}); generated ${new Date().toISOString()} (${source})`)
  lines.push(`-- Rollback: see the matching .rollback.sql file`)
  lines.push('')
  lines.push(`insert into subjects (name, exam_board, spec_code) values (${sqlString(spec.subject)}, ${sqlString(spec.exam_board)}, ${sqlString(spec.spec_code)}) on conflict (name) do nothing;`)
  lines.push('')

  const newTopics = topics.filter((t) => !t.existing)
  const newSubtopics = []

  for (const t of topics) {
    if (!t.existing) {
      lines.push(`insert into topics (subject_id, name, spec_ref, paper, display_order) values (${subjectId}, ${sqlString(t.name)}, ${sqlString(t.spec_ref)}, ${sqlString(t.paper)}, ${t.display_order});`)
    }
    for (const st of t.subtopics) {
      if (!st.existing) {
        newSubtopics.push([t, st])
        lines.push(`insert into subtopics (topic_id, name, spec_ref, display_order) values (${topicRef(t)}, ${sqlString(st.name)}, ${sqlString(st.spec_ref)}, ${st.display_order});`)
      }
    }
    lines.push('')

    // One insert per topic; each row names its subtopic. v.n keeps the
    // authored order for building quizzes. where-not-exists dedupes against
    // every existing question, including old rows whose content_hash is null.
    const values = []
    for (const st of t.subtopics) {
      for (const r of st.rows) {
        values.push(`  (${values.length + 1}, ${[st.name, r.question_text, r.option_a, r.option_b, r.option_c, r.option_d, r.correct_option, r.explanation, r.difficulty, r.question_type, r.ao_weighting].map(sqlString).join(', ')})`)
      }
    }
    if (values.length) {
      lines.push(`insert into questions (topic_id, subtopic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, question_type, ao_weighting, generation_batch_id, content_hash, active, created_at)
select s.topic_id, s.id, v.qt, v.a, v.b, v.c, v.d, v.co, v.ex, v.dif, v.qtype, v.ao, ${batch}, ${HASH_SQL('v.qt')}, true, now() + v.n * interval '1 microsecond'
from (values
${values.join(',\n')}
) as v(n, sub, qt, a, b, c, d, co, ex, dif, qtype, ao)
join subtopics s on s.topic_id = ${topicRef(t)} and s.name = v.sub
where not exists (select 1 from questions q where ${HASH_SQL('q.question_text')} = ${HASH_SQL('v.qt')});`)
    }
    lines.push('')

    // Quizzes for new topics, same shape as the existing ones: "Quiz N",
    // up to 20 questions each, 7-day cooldown, dealt round-robin in subtopic order.
    if (!t.existing) {
      const total = t.subtopics.reduce((n, st) => n + st.rows.length, 0)
      const nQuizzes = Math.max(1, Math.ceil(total / QUIZ_SIZE))
      for (let qi = 0; qi < nQuizzes; qi++) {
        lines.push(`insert into quizzes (topic_id, title, display_order, question_count, cooldown_hours) values (${topicRef(t)}, ${sqlString(`Quiz ${qi + 1}`)}, ${qi + 1}, 0, 168);`)
      }
      lines.push(`with ordered as (
  select q.id, row_number() over (order by q.created_at) - 1 as i
  from questions q join subtopics s on s.id = q.subtopic_id
  where q.generation_batch_id = ${batch} and q.topic_id = ${topicRef(t)}
)
insert into quiz_questions (quiz_id, question_id, position)
select z.id, o.id, (o.i / ${nQuizzes})::int + 1
from ordered o join quizzes z on z.topic_id = ${topicRef(t)} and z.title = 'Quiz ' || ((o.i % ${nQuizzes}) + 1);`)
      lines.push(`update quizzes z set question_count = (select count(*) from quiz_questions qq where qq.quiz_id = z.id) where z.topic_id = ${topicRef(t)};`)
      lines.push('')
    }
  }

  const rollback = []
  rollback.push(`-- Rollback for content batch ${batchId} (${spec.exam_board} ${spec.subject})`)
  for (const t of newTopics) rollback.push(`delete from quizzes where topic_id = ${topicRef(t)};`)
  rollback.push(`delete from questions where generation_batch_id = ${batch};`)
  for (const [t, st] of newSubtopics) rollback.push(`delete from subtopics where id = ${subtopicRef(t, st)};`)
  for (const t of newTopics) rollback.push(`delete from topics where id = ${topicRef(t)};`)
  rollback.push(`-- The subjects row is left in place; delete it by hand if the whole subject should go.`)

  return { sql: lines.join('\n') + '\n', rollbackSql: rollback.join('\n') + '\n' }
}

// Checksum of the authored content, for comparing with what landed in the
// database after applying a batch (see CHECKSUM_SQL).
export function batchChecksum(rows) {
  const parts = rows
    .map((r) => [r.question_text, r.option_a, r.option_b, r.option_c, r.option_d, r.correct_option, r.explanation, r.difficulty, r.question_type, r.ao_weighting].join('|'))
    .sort((x, y) => (Buffer.from(x) < Buffer.from(y) ? -1 : Buffer.from(x) > Buffer.from(y) ? 1 : 0))
  return createHash('md5').update(parts.join('\n'), 'utf8').digest('hex')
}

export const CHECKSUM_SQL = (batchId) => `select count(*) as n, md5(string_agg(concat_ws('|', question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, question_type, ao_weighting), E'\\n' order by convert_to(concat_ws('|', question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, question_type, ao_weighting), 'UTF8'))) as checksum from questions where generation_batch_id = '${batchId}';`

// ---------- main ----------

function parseArgs(argv) {
  const args = { perTopic: 20, concurrency: 3 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--spec') args.spec = argv[++i]
    else if (a === '--topics') args.topics = argv[++i].split(',').map((s) => s.trim())
    else if (a === '--per-topic') args.perTopic = Number(argv[++i])
    else if (a === '--avoid') args.avoid = argv[++i]
    else if (a === '--concurrency') args.concurrency = Number(argv[++i])
    else if (a === '--authored') args.authored = argv[++i]
    else throw new Error(`Unknown argument ${a}`)
  }
  if (!args.spec) throw new Error('--spec is required')
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const apiKey = process.env.ANTHROPIC_API_KEY
  const authored = args.authored ? JSON.parse(readFileSync(args.authored, 'utf8')) : null
  if (!authored && !apiKey) throw new Error('ANTHROPIC_API_KEY is not set (or pass --authored)')

  const spec = JSON.parse(readFileSync(args.spec, 'utf8'))
  const avoidTexts = args.avoid ? JSON.parse(readFileSync(args.avoid, 'utf8')) : []
  const seenHashes = new Set(avoidTexts.map(contentHash))
  const batchId = randomUUID()

  const topics = spec.topics
    .filter((t) => !args.topics || args.topics.includes(t.spec_ref))
    .map((t) => ({
      ...t,
      id: t.existing ? null : randomUUID(),
      subtopics: t.subtopics.map((st, i) => ({ ...st, id: st.existing ? null : randomUUID(), display_order: st.display_order ?? i + 1, rows: [] })),
    }))
  if (topics.length === 0) throw new Error('No topics selected')

  console.log(`Batch ${batchId}: ${spec.exam_board} ${spec.subject} (${spec.spec_code}), ${topics.length} topic(s)`)
  const source = authored ? 'hand-authored' : MODEL
  const report = { batchId, subject: spec.subject, model: source, topics: [] }

  if (authored) {
    for (const t of topics) {
      const topicReport = { name: t.name, spec_ref: t.spec_ref, kept: 0, dropped: [] }
      for (const st of t.subtopics) {
        for (const q of authored[t.spec_ref]?.[st.spec_ref] ?? []) {
          if (!isWellFormed(q)) { topicReport.dropped.push({ subtopic: st.name, question: q?.question ?? '(missing)', reason: 'malformed' }); continue }
          const row = toRow(q)
          if (seenHashes.has(row.content_hash)) { topicReport.dropped.push({ subtopic: st.name, question: row.question_text, reason: 'duplicate' }); continue }
          seenHashes.add(row.content_hash)
          st.rows.push({ ...row, id: randomUUID() })
        }
        topicReport.kept += st.rows.length
      }
      const unknown = Object.keys(authored[t.spec_ref] ?? {}).filter((ref) => !t.subtopics.some((st) => st.spec_ref === ref))
      if (unknown.length) throw new Error(`${t.spec_ref}: authored subtopic refs not in spec: ${unknown.join(', ')}`)
      report.topics.push(topicReport)
      console.log(`${t.spec_ref} ${t.name}: ${topicReport.kept} kept, ${topicReport.dropped.length} dropped`)
    }
  }


  for (const t of authored ? [] : topics) {
    const target = t.target ?? args.perTopic
    console.log(`\n${t.spec_ref} ${t.name} — target ${target}`)
    const counts = allocate(target, t.subtopics.length)
    const jobs = t.subtopics.map((st, i) => ({ st, count: counts[i] })).filter((j) => j.count > 0)
    const results = await mapLimit(jobs, args.concurrency, ({ st, count }) =>
      buildSubtopic({ apiKey, spec, topic: t, subtopic: st, target: count, seenHashes, avoidTexts }))
    const topicReport = { name: t.name, spec_ref: t.spec_ref, kept: 0, dropped: [] }
    jobs.forEach(({ st }, i) => {
      st.rows = results[i].kept.map((r) => ({ ...r, id: randomUUID() }))
      topicReport.kept += st.rows.length
      topicReport.dropped.push(...results[i].dropped.map((d) => ({ subtopic: st.name, question: d.row.question_text, reason: d.reason })))
    })
    report.topics.push(topicReport)
    console.log(`  => ${topicReport.kept} kept, ${topicReport.dropped.length} dropped`)
  }

  balanceLetters(topics.flatMap((t) => t.subtopics.flatMap((st) => st.rows)))
  const { sql, rollbackSql } = buildSql({ spec, batchId, topics, source })
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const outDir = join(root, 'supabase', 'content-batches')
  mkdirSync(outDir, { recursive: true })
  const slug = `${new Date().toISOString().slice(0, 10)}-${spec.exam_board}-${spec.spec_code}-${spec.subject}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const base = join(outDir, `${slug}-${batchId.slice(0, 8)}`)
  writeFileSync(`${base}.sql`, sql)
  writeFileSync(`${base}.rollback.sql`, rollbackSql)
  const allRows = topics.flatMap((t) => t.subtopics.flatMap((st) => st.rows))
  report.questions = allRows.length
  report.checksum = batchChecksum(allRows)
  report.checksum_sql = CHECKSUM_SQL(batchId)
  writeFileSync(`${base}.report.json`, JSON.stringify(report, null, 2))
  console.log(`\nWrote ${base}.sql (+ .rollback.sql, .report.json)`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error(err.message ?? err); process.exit(1) })
}
