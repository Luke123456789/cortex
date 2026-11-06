// One-off content tool: drafts new wrong answers (distractors) for a
// subject's multiple-choice questions so the correct answer no longer stands
// out. Each draft is quality-checked (length, absolutes, hedging, throwaway
// options; one retry with feedback) and then independently answered by a
// second call to make sure only the intended option is right. Drafts go to
// question_option_revisions only; nothing live changes here.
// Parent-only. Call repeatedly: each call handles up to `limit` questions
// that have no revision in this batch yet.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { getCaller } from '../_shared/access.ts'
import { checkQuestion, optionsOf, LETTERS } from './option-quality.js'
import {
  buildRewritePrompt,
  REWRITE_TOOL,
  extractDistractors,
  placeOptions,
  buildVerifyPrompt,
  VERIFY_TOOL,
  verdict,
} from './rewrite-logic.js'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function claude(prompt: string, tool: any) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
    }),
  })
  if (!res.ok) {
    console.error('rewrite-distractors: Anthropic error', res.status, await res.text())
    return null
  }
  return res.json()
}

async function rewriteOne(q: any) {
  const correct = String(q.correct_option).toUpperCase()
  const old = optionsOf(q)
  const correctText = old[correct as 'A']
  const oldWrong = LETTERS.filter((l) => l !== correct).map((l) => old[l as 'A'])
  const ctx = {
    subject: q.topics?.subjects?.name,
    examBoard: q.topics?.subjects?.exam_board,
    topic: q.topics?.name,
    subtopic: q.subtopics?.name,
    question: q.question_text,
    correctText,
    oldWrong,
  }

  let options: Record<string, string> | null = null
  let quality: any = null
  let feedback = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    const d = extractDistractors(await claude(buildRewritePrompt({ ...ctx, feedback }), REWRITE_TOOL))
    if (!d) { feedback = 'You must return exactly three non-empty wrong answers.'; continue }
    options = placeOptions(correct, correctText, d)
    quality = checkQuestion(options, correct)
    if (quality.ok) break
    feedback = quality.issues.join('; ')
  }
  if (!options) return { question_id: q.id, status: 'flagged', reason: 'no draft produced', options: old, quality: null, check: null }

  const check = quality?.ok ? verdict(await claude(buildVerifyPrompt({ subject: ctx.subject, question: q.question_text, options }), VERIFY_TOOL), correct) : null
  const status = quality?.ok && check?.ok ? 'draft' : 'flagged'
  return { question_id: q.id, status, options, quality, check, old }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const caller = await getCaller(req)
  if (!caller || caller.role !== 'parent') return json({ error: 'parents only' }, 403)
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500)

  const { subject, batch, limit = 8 } = await req.json().catch(() => ({}))
  if (!subject || !batch) return json({ error: 'subject and batch required' }, 400)
  const take = Math.min(Math.max(1, Number(limit) || 8), 12)

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: subj } = await admin.from('subjects').select('id').eq('name', subject).single()
  if (!subj) return json({ error: 'unknown subject' }, 404)
  const { data: topicRows } = await admin.from('topics').select('id').eq('subject_id', subj.id)
  const topicIds = (topicRows || []).map((t: any) => t.id)
  const { data: done } = await admin.from('question_option_revisions').select('question_id').eq('batch', batch)
  const doneIds = new Set((done || []).map((r: any) => r.question_id))

  const { data: all, error } = await admin
    .from('questions')
    .select('id, question_text, option_a, option_b, option_c, option_d, correct_option, subtopics (name), topics (name, subjects (name, exam_board))')
    .in('topic_id', topicIds)
    .eq('active', true)
    .order('id')
  if (error) return json({ error: 'failed to load questions' }, 500)
  const todo = (all || []).filter((q: any) => !doneIds.has(q.id))
  const pick = todo.slice(0, take)

  const results = await Promise.all(pick.map((q: any) => rewriteOne(q).catch((e) => ({ question_id: q.id, status: 'flagged', reason: String(e), options: optionsOf(q), quality: null, check: null, old: optionsOf(q) }))))

  const rows = results.map((r: any, i: number) => ({
    question_id: r.question_id,
    subject,
    batch,
    correct_option: String(pick[i].correct_option).toUpperCase(),
    old_options: optionsOf(pick[i]),
    new_options: r.options,
    checks: { quality: r.quality, verify: r.check, reason: r.reason ?? null },
    status: r.status,
  }))
  if (rows.length) {
    const { error: insErr } = await admin.from('question_option_revisions').insert(rows)
    if (insErr) {
      console.error('rewrite-distractors: insert failed', insErr)
      return json({ error: 'failed to save drafts' }, 500)
    }
  }
  return json({
    processed: rows.length,
    drafts: rows.filter((r) => r.status === 'draft').length,
    flagged: rows.filter((r) => r.status === 'flagged').length,
    remaining: todo.length - rows.length,
  })
})
