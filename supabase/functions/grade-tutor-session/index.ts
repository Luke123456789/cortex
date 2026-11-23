import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { getCaller } from '../_shared/access.ts'
import { GRADE_TOOL, buildGradingPrompt, countContentReplies, decideOutcome, extractGradeFromResponse, formatTranscript, pickExamAnswer } from './grading-logic.js'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405, headers: corsHeaders })
  }
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const caller = await getCaller(req)
  if (!caller) return new Response('unauthorized', { status: 401, headers: corsHeaders })

  // The transcript is read from the database (written turn by turn by
  // tutor-chat), never taken from the request body.
  const { sessionId, subjectName, topicName, subtopicName } = await req.json()
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'sessionId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Ownership check, through the caller's own JWT (RLS-scoped), never the
  // service role: the session must be visible to the caller AND the caller
  // must be allowed to act as its student (the student themselves, or a
  // parent for their practice student). A parent can read James's sessions
  // but can never grade them.
  const { data: session, error: sessionErr } = await caller.client
    .from('tutor_sessions')
    .select('id, student_id, reward_claimed, messages, lesson_plan')
    .eq('id', sessionId)
    .single()

  if (sessionErr || !session) {
    return new Response(JSON.stringify({ error: 'session not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const { data: mayWrite } = await caller.client.rpc('can_write_as', { p_student: session.student_id })
  if (mayWrite !== true) {
    return new Response(JSON.stringify({ error: 'session not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  if (session.reward_claimed) {
    return new Response(JSON.stringify({ claimed: false, alreadyClaimed: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // The tutor's opening question isn't part of the stored turns, so put it
  // back in front: the first answer is a reply to it.
  const stored = Array.isArray(session.messages) ? session.messages : []
  const opening = session.lesson_plan?.openingLine
  const messages = typeof opening === 'string' && opening ? [{ role: 'assistant', content: opening }, ...stored] : stored
  const contentReplies = countContentReplies(messages)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  // Nothing worth sending to the grader yet.
  if (contentReplies === 0) {
    return json({ claimed: false, incomplete: true, toFinish: "You haven't answered any of the tutor's questions yet — have a go at the first one." })
  }

  const transcriptText = formatTranscript(messages)
  const prompt = buildGradingPrompt(subjectName ?? 'the subject', topicName ?? 'the topic', subtopicName ?? 'this subtopic', transcriptText)

  const gradingRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
      tools: [GRADE_TOOL],
      tool_choice: { type: 'tool', name: 'submit_grade' },
    }),
  })

  if (!gradingRes.ok) {
    console.error('Anthropic grading error', gradingRes.status, await gradingRes.text())
    return new Response(JSON.stringify({ error: 'grading call failed' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const gradingData = await gradingRes.json()
  const grade = extractGradeFromResponse(gradingData)

  if (!grade) {
    console.error('Malformed grading response', JSON.stringify(gradingData))
    return new Response(JSON.stringify({ error: 'grading response malformed' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const outcome = decideOutcome(grade, contentReplies)
  const exam = grade.examMarksAvailable > 0
    ? {
        awarded: grade.examMarksAwarded,
        available: grade.examMarksAvailable,
        question: grade.examQuestion,
        answer: pickExamAnswer(messages, grade.examAnswerTurns),
      }
    : null

  // Not done yet: no reward, session stays open so they can carry on.
  if (!outcome.complete) {
    return json({ claimed: false, incomplete: true, toFinish: outcome.toFinish, answers: outcome.answers, exam })
  }
  const { minutes } = outcome
  const { feedback } = grade

  // Service-role client: the only caller allowed to execute
  // grade_and_claim_tutor_reward. Never exposed to the browser.
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: claimResult, error: claimErr } = await serviceClient
    .rpc('grade_and_claim_tutor_reward', { p_session_id: sessionId, p_minutes: minutes })
    .single<{ claimed: boolean; minutes_awarded: number | null }>()

  if (claimErr) {
    console.error('grade_and_claim_tutor_reward error', claimErr)
    return new Response(JSON.stringify({ error: 'reward claim failed' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Keep the result so it can be reviewed and shared later.
  const savedGrade = {
    minutes,
    quality: grade.quality,
    answers: outcome.answers,
    feedback,
    exam,
    gradedAt: new Date().toISOString(),
  }
  const { error: saveErr } = await serviceClient.from('tutor_sessions').update({ grade: savedGrade }).eq('id', sessionId)
  if (saveErr) console.error('Failed to save tutor session grade', saveErr)

  return json({
    claimed: claimResult?.claimed ?? false,
    minutesAwarded: claimResult?.minutes_awarded ?? null,
    feedback,
    answers: outcome.answers,
    exam,
  })
})
