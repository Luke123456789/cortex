// Overnight content generation. Called on a schedule by pg_cron (via pg_net)
// with the shared secret from the vault (content_cron_secret); each call claims one job from public.content_jobs and
// does one small step of it:
//   questions job: write a few standalone exam questions for a topic
//   paper job:     write the paper's blueprint, or the next few questions
// Everything it inserts is tagged with the job's batch so it can be reviewed
// or retired together.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import {
  BOARDS, QUESTIONS_TOOL, BLUEPRINT_TOOL, validateQuestion, validateBlueprint, withSources,
  questionsPrompt, blueprintPrompt, slotsPrompt, normaliseToolInput,
} from './content-logic.js'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MODEL = 'claude-sonnet-5'
const QUESTIONS_PER_CALL = 6
const SLOTS_PER_CALL = 3
const ANTHROPIC_TIMEOUT_MS = 140_000

const db = createClient(SUPABASE_URL, SERVICE_KEY)
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

async function callTool(prompt: string, tool: any, maxTokens: number) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
    }),
  })
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  if (data.stop_reason === 'max_tokens') throw new Error('reply cut off at max_tokens')
  const input = data.content?.find((b: any) => b.type === 'tool_use')?.input
  if (!input) throw new Error('no tool call in reply')
  return normaliseToolInput(input)
}

async function must<T>(p: PromiseLike<{ data: T; error: any }>): Promise<T> {
  const { data, error } = await p
  if (error) throw new Error(error.message ?? String(error))
  return data
}

// Inserts one validated question and its mark scheme. Returns false if the
// same question text already exists.
async function insertQuestion(row: any, extra: { topic_id: string; exam_board: string; batch: string; paper_ref?: string | null; paper_number?: number | null }) {
  const dup = await must(db.from('fm_exam_questions').select('id').eq('question_text', row.question_text).limit(1))
  if ((dup as any[]).length) return false
  const q = await must(db.from('fm_exam_questions').insert({
    subtopic_id: row.subtopic_id,
    topic_id: extra.topic_id,
    question_text: row.question_text,
    command_word: row.command_word,
    total_marks: row.total_marks,
    difficulty: row.difficulty,
    exam_board: extra.exam_board,
    spec_ref: row.spec_ref,
    active: true,
    paper_ref: extra.paper_ref ?? null,
    paper_number: extra.paper_number ?? null,
    generation_batch: extra.batch,
  }).select('id').single()) as any
  const { error } = await db.from('fm_mark_schemes').insert({
    question_id: q.id, marking_style: row.marking_style, scheme: row.scheme, ao_marks: row.ao_marks, spag_marks: row.spag_marks,
  })
  if (error) {
    await db.from('fm_exam_questions').delete().eq('id', q.id)
    throw new Error(`mark scheme insert: ${error.message}`)
  }
  return true
}

async function doQuestions(job: any, subject: any, board: any) {
  const topic = await must(db.from('topics').select('id, name, spec_ref').eq('id', job.topic_id).single()) as any
  const subtopics = await must(db.from('subtopics').select('id, name, spec_ref').eq('topic_id', job.topic_id)) as any[]
  const existing = await must(db.from('fm_exam_questions').select('question_text').eq('topic_id', job.topic_id).is('paper_ref', null).eq('active', true).order('created_at', { ascending: false }).limit(70)) as any[]
  const count = Math.min(QUESTIONS_PER_CALL, job.target - job.made)
  const prompt = questionsPrompt({
    subject, board, topic, subtopics, count,
    existing: existing.map((e) => e.question_text.replace(/\s+/g, ' ').slice(0, 110)),
  })
  const out = await callTool(prompt, QUESTIONS_TOOL, 12000)
  let added = 0
  const rejected: string[] = []
  for (const q of (out.questions ?? []).slice(0, count)) {
    const v: any = validateQuestion(q, subtopics.length ? subtopics : null)
    if (!v.ok) { rejected.push(v.reason); continue }
    try {
      if (await insertQuestion(v.row, { topic_id: topic.id, exam_board: board.board, batch: job.batch })) added++
      else rejected.push('duplicate')
    } catch (e) {
      rejected.push(`insert failed: ${(e as Error).message}`)
    }
  }
  return { added, rejected, done: job.made + added >= job.target }
}

async function doPaper(job: any, subject: any, board: any) {
  const paper = board.papers[job.component]
  if (!paper) throw new Error(`no paper ${job.component} for ${subject.name}`)
  const topics = await must(db.from('topics').select('id, name').eq('subject_id', subject.id)) as any[]

  // Step 1: the blueprint, and the paper row (inactive until complete).
  if (!job.plan) {
    const { count: existingMocks } = await db.from('fm_papers').select('ref', { count: 'exact', head: true }).eq('subject_id', subject.id).is('topic_id', null)
    const mockNumber = (existingMocks ?? 0) + 1
    const bp = await callTool(blueprintPrompt({ board, paper, component: job.component, topics, mockNumber }), BLUEPRINT_TOOL, board.sourced ? 12000 : 6000)
    const v: any = validateBlueprint(bp, topics)
    if (!v.ok) return { added: 0, rejected: [v.reason], done: false }
    const ref = `${board.slug}-p${job.component}-gen${job.id}`
    const title = `${paper.title}: Mock ${mockNumber}`
    await must(db.from('fm_papers').upsert({
      ref, subject_id: subject.id, title, exam_board: board.board, duration_minutes: paper.duration,
      calculator: paper.calculator, total_marks: v.plan.total, instructions: v.plan.instructions,
      active: false, generation_batch: job.batch,
    }, { onConflict: 'ref' }))
    await must(db.from('content_jobs').update({ plan: v.plan, paper_ref: ref, target: v.plan.slots.length, made: 0 }).eq('id', job.id))
    return { added: 0, rejected: [], done: false, note: `blueprint: ${v.plan.slots.length} questions, ${v.plan.total} marks` }
  }

  // Later steps: the next few questions.
  const plan = job.plan
  const slots = plan.slots.slice(job.made, job.made + SLOTS_PER_CALL)
  const out = await callTool(slotsPrompt({ board, paper, plan, slots }), QUESTIONS_TOOL, board.sourced ? 12000 : 10000)
  const qs = out.questions ?? []
  let added = 0
  const rejected: string[] = []
  // Paper questions must come back in order, one per slot; stop at the first
  // bad one so numbering never skips.
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    const v: any = validateQuestion(qs[i], null)
    if (!v.ok) { rejected.push(`Q${slot.number}: ${v.reason}`); break }
    const row = { ...v.row, question_text: withSources(v.row.question_text, slot, plan) }
    let ok = false
    try {
      ok = await insertQuestion(row, { topic_id: slot.topic_id, exam_board: board.board, batch: job.batch, paper_ref: job.paper_ref, paper_number: slot.number })
    } catch (e) {
      rejected.push(`Q${slot.number}: insert failed: ${(e as Error).message}`)
      break
    }
    if (!ok) { rejected.push(`Q${slot.number}: duplicate`); break }
    added++
  }
  const done = job.made + added >= job.target
  if (done) {
    const qrows = await must(db.from('fm_exam_questions').select('total_marks').eq('paper_ref', job.paper_ref)) as any[]
    const total = qrows.reduce((n, r) => n + r.total_marks, 0)
    await must(db.from('fm_papers').update({ total_marks: total, active: true }).eq('ref', job.paper_ref))
  }
  return { added, rejected, done }
}

Deno.serve(async (req) => {
  // The caller must send the secret kept in the database vault (pg_cron does).
  const secret = req.headers.get('x-cron-secret') ?? ''
  const check = await db.rpc('check_content_cron_secret', { p_secret: secret })
  if (check.error || check.data !== true) return json({ error: 'forbidden' }, 403)
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500)

  const claimed = await db.rpc('claim_content_job')
  if (claimed.error) return json({ error: claimed.error.message }, 500)
  const job = claimed.data?.[0]
  if (!job) return json({ idle: true })

  const started = Date.now()
  try {
    const subject = await must(db.from('subjects').select('id, name').eq('id', job.subject_id).single()) as any
    const board = (BOARDS as any)[subject.name]
    if (!board) throw new Error(`no board config for ${subject.name}`)
    const r: any = job.kind === 'questions' ? await doQuestions(job, subject, board) : await doPaper(job, subject, board)
    const progressed = r.added > 0 || !!r.note
    await must(db.from('content_jobs').update({
      made: job.kind === 'paper' && r.note ? 0 : job.made + r.added,
      status: r.done ? 'done' : 'pending',
      failures: progressed ? 0 : job.failures, // claim already counted this run as a failure
      last_error: progressed ? null : (r.rejected.join('; ') || 'nothing added').slice(0, 500),
      updated_at: new Date().toISOString(),
    }).eq('id', job.id))
    await db.from('content_job_log').insert({ job_id: job.id, ok: progressed, added: r.added, rejected: r.rejected.length, ms: Date.now() - started, note: (r.note ?? r.rejected.join('; ')).slice(0, 500) || null })
    return json({ job: job.id, ...r })
  } catch (err) {
    const msg = String((err as Error)?.message ?? err).slice(0, 500)
    console.error('content job failed', job.id, msg)
    await db.from('content_jobs').update({ status: job.failures >= 5 ? 'failed' : 'pending', last_error: msg, updated_at: new Date().toISOString() }).eq('id', job.id)
    await db.from('content_job_log').insert({ job_id: job.id, ok: false, ms: Date.now() - started, note: msg })
    return json({ job: job.id, error: msg }, 500)
  }
})
