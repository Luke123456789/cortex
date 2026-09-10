import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { computeReward, gradeAnswers } from './quiz-grading-logic.js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function getStudentUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'student') return null
  return { id: user.id }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405, headers: corsHeaders })
  }

  const student = await getStudentUser(req)
  if (!student) return new Response('unauthorized', { status: 401, headers: corsHeaders })

  const { quizId, answers } = await req.json()
  if (!quizId || !Array.isArray(answers)) {
    return new Response(JSON.stringify({ error: 'quizId and answers required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Service-role client: needed to insert quiz_sessions/student_question_history/
  // ledger_entries rows directly (RLS on those tables doesn't permit a
  // client-driven earn insert for quizzes — the whole point of pulling this
  // server-side after the reward-exploit cleanup) and to check assignments,
  // which the student has no write access to at all.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Gate: quizzes are parent-assigned only. A quiz can only be graded (and
  // rewarded) if there's a pending assignment for it — this is what
  // replaces the old client-side cooldown-lock as the anti-grinding control,
  // and it's enforced here, not just hidden in the UI, so it can't be
  // bypassed by calling this function directly.
  const { data: assignment, error: assignmentErr } = await admin
    .from('assignments')
    .select('id')
    .eq('type', 'quiz')
    .eq('quiz_id', quizId)
    .eq('status', 'pending')
    .order('assigned_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (assignmentErr) {
    console.error('Failed to check quiz assignment', assignmentErr)
    return new Response(JSON.stringify({ error: 'failed to check assignment' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  if (!assignment) {
    return new Response(JSON.stringify({ error: 'This quiz has not been assigned' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { data: quiz, error: quizErr } = await admin
    .from('quizzes')
    .select('id, title, topic_id')
    .eq('id', quizId)
    .single()

  if (quizErr || !quiz) {
    return new Response(JSON.stringify({ error: 'quiz not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { data: quizQuestionRows, error: questionsErr } = await admin
    .from('quiz_questions')
    .select('position, questions (id, correct_option, explanation)')
    .eq('quiz_id', quizId)
    .order('position')

  if (questionsErr || !quizQuestionRows || quizQuestionRows.length === 0) {
    console.error('Failed to load quiz questions', questionsErr)
    return new Response(JSON.stringify({ error: 'quiz has no questions' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const questions = quizQuestionRows.map((r: any) => r.questions).filter(Boolean)
  const { results, correctCount, totalCount } = gradeAnswers(questions, answers)
  const minutesAwarded = computeReward(correctCount)

  const now = new Date().toISOString()
  const { data: session, error: sessionErr } = await admin
    .from('quiz_sessions')
    .insert({
      student_id: student.id,
      topic_id: quiz.topic_id,
      quiz_id: quiz.id,
      quiz_format: 'standard',
      question_count: totalCount,
      score: correctCount,
      started_at: now,
      completed_at: now,
    })
    .select('id')
    .single()

  if (sessionErr || !session) {
    console.error('Failed to save quiz session', sessionErr)
    return new Response(JSON.stringify({ error: 'failed to save quiz session' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const historyRows = results.map((r) => ({
    student_id: student.id,
    question_id: r.questionId,
    answered_correctly: r.correct,
    quiz_session_id: session.id,
  }))
  const { error: historyErr } = await admin.from('student_question_history').insert(historyRows)
  if (historyErr) console.error('Failed to save question history', historyErr)

  if (minutesAwarded > 0) {
    const { error: ledgerErr } = await admin.from('ledger_entries').insert({
      type: 'earn',
      amount_minutes: minutesAwarded,
      source: quiz.title || 'Quiz',
      note: `${correctCount}/${totalCount} correct`,
    })
    if (ledgerErr) console.error('Failed to log quiz reward', ledgerErr)
  }

  return new Response(JSON.stringify({
    score: correctCount,
    totalCount,
    minutesAwarded,
    results,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
