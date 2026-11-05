// Marks a typed written answer against its mark scheme. Two independent
// markings are combined (mean, rounded down); if they disagree by more than
// 10% of the marks the attempt is flagged for a parent to check. Saving the
// attempt completes the written_test assignment (DB trigger) and the reward
// goes to the ledger here (none for the practice student).
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { getCaller, resolveWritableStudent } from '../_shared/access.ts'
import {
  validateAnswer,
  buildMarkingPrompt,
  markingTool,
  extractMark,
  reconcile,
  computeMinutes,
} from './marking-logic.js'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

async function markOnce(prompt: string, tool: unknown) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
      tools: [tool],
      tool_choice: { type: 'tool', name: 'submit_mark' },
    }),
  })
  if (!res.ok) {
    console.error('mark-written-answer: Anthropic error', res.status, await res.text())
    return null
  }
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const caller = await getCaller(req)
  if (!caller) return json({ error: 'Please sign in again.' }, 401)

  const { questionId, answer, studentId } = await req.json().catch(() => ({}))
  if (!questionId) return json({ error: 'questionId required' }, 400)
  const checked = validateAnswer(answer)
  if (!checked.ok) return json({ error: checked.error }, 400)

  // The student themselves, or a parent acting for their practice student.
  const student = await resolveWritableStudent(caller, studentId)
  if (!student) return json({ error: 'You can only submit an answer as yourself or as your practice student.' }, 403)

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Written work is parent-assigned: there must be a pending assignment.
  const { data: assignment, error: assignmentErr } = await admin
    .from('assignments')
    .select('id')
    .eq('type', 'written_test')
    .eq('exam_question_id', questionId)
    .eq('student_id', student.id)
    .eq('status', 'pending')
    .order('assigned_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (assignmentErr) {
    console.error('mark-written-answer: assignment check failed', assignmentErr)
    return json({ error: 'failed to check assignment' }, 500)
  }
  if (!assignment) return json({ error: 'This question has not been assigned, or it has already been answered.' }, 403)

  const { data: question, error: questionErr } = await admin
    .from('fm_exam_questions')
    .select('id, question_text, command_word, total_marks, exam_board, topics (name, subjects (name))')
    .eq('id', questionId)
    .single()
  const { data: scheme, error: schemeErr } = await admin
    .from('fm_mark_schemes')
    .select('marking_style, scheme, ao_marks, spag_marks')
    .eq('question_id', questionId)
    .single()
  if (questionErr || schemeErr || !question || !scheme) {
    console.error('mark-written-answer: question or scheme missing', questionErr, schemeErr)
    return json({ error: 'This question has no mark scheme yet.' }, 500)
  }
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500)

  const subjectName = (question as any).topics?.subjects?.name ?? null
  const prompt = buildMarkingPrompt({ question, scheme, subjectName, examBoard: question.exam_board, answer: checked.text })
  const tool = markingTool(question, scheme)

  const [r1, r2] = await Promise.all([markOnce(prompt, tool), markOnce(prompt, tool)])
  const result = reconcile(
    r1 ? extractMark(r1, question, scheme) : null,
    r2 ? extractMark(r2, question, scheme) : null,
    question.total_marks,
  )
  if (!result) return json({ error: 'Marking failed. Your answer was not saved; try again in a moment.' }, 502)

  const minutes = computeMinutes(result.marks, question.total_marks, student.isPractice)
  const now = new Date().toISOString()

  const { data: attempt, error: insertErr } = await admin
    .from('fm_attempts')
    .insert({
      student_id: student.id,
      question_id: question.id,
      assignment_id: assignment.id,
      answer_source: 'typed',
      transcribed_answer: checked.text,
      marks_awarded: result.marks,
      total_marks: question.total_marks,
      level: result.level,
      ao_awarded: result.aoAwarded,
      credited: result.credited,
      missing: result.missing,
      next_step: result.nextStep,
      command_word_satisfied: result.commandWordSatisfied,
      feedback_summary: result.summary,
      marking_runs: result.runs.map((r: any) => (r ? { marks: r.marks, level: r.level, summary: r.summary } : null)),
      needs_review: result.needsReview,
      minutes_earned: minutes,
      submitted_at: now,
      marked_at: now,
    })
    .select('id')
    .single()
  if (insertErr || !attempt) {
    console.error('mark-written-answer: failed to save attempt', insertErr)
    return json({ error: 'Your answer was marked but could not be saved. Try again.' }, 500)
  }

  if (minutes > 0) {
    const { error: ledgerErr } = await admin.from('ledger_entries').insert({
      student_id: student.id,
      type: 'earn',
      amount_minutes: minutes,
      source: 'Written test',
      note: `${result.marks}/${question.total_marks}`,
    })
    if (ledgerErr) console.error('mark-written-answer: failed to log reward', ledgerErr)
  }

  return json({
    attemptId: attempt.id,
    marks: result.marks,
    totalMarks: question.total_marks,
    level: result.level,
    spagMarks: result.spagMarks,
    credited: result.credited,
    missing: result.missing,
    nextStep: result.nextStep,
    commandWordSatisfied: result.commandWordSatisfied,
    summary: result.summary,
    minutesEarned: minutes,
  })
})
