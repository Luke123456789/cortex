import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import {
  WINDOWS,
  isValidWindow,
  windowSince,
  hasEvidence,
  emptyEvidenceResult,
  buildAssessmentPrompt,
  extractAssessmentFromResponse,
} from './assessment-logic.js'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function getParentUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'parent') return null
  return { id: user.id }
}

// Resolves which topics/subtopics/questions fall under a subject filter, so
// the evidence queries below can filter with a plain .in() instead of
// relying on filtering through multi-level embedded resources. Returns null
// for "no subject filter" (i.e. don't restrict).
async function loadSubjectScope(admin: ReturnType<typeof createClient>, subjectId: string | null) {
  if (!subjectId) return null

  const { data: topicRows } = await admin.from('topics').select('id').eq('subject_id', subjectId)
  const topicIds = (topicRows || []).map((t: { id: string }) => t.id)
  if (topicIds.length === 0) return { topicIds: [], subtopicIds: [], questionIds: [] }

  const { data: subtopicRows } = await admin.from('subtopics').select('id').in('topic_id', topicIds)
  const subtopicIds = (subtopicRows || []).map((s: { id: string }) => s.id)

  const { data: questionRows } = await admin.from('fm_exam_questions').select('id').in('topic_id', topicIds)
  const questionIds = (questionRows || []).map((q: { id: string }) => q.id)

  return { topicIds, subtopicIds, questionIds }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405, headers: corsHeaders })
  }

  const parent = await getParentUser(req)
  if (!parent) return new Response('unauthorized', { status: 401, headers: corsHeaders })

  const { subjectId = null, window: windowKey } = await req.json()
  if (!isValidWindow(windowKey)) {
    return new Response(JSON.stringify({ error: 'invalid window' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Service-role client: this aggregation needs to read across the whole
  // student's history regardless of the caller's own RLS scope, and is the
  // only place allowed to insert the final assessments row.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: student, error: studentErr } = await admin
    .from('profiles')
    .select('id, display_name')
    .eq('role', 'student')
    .limit(1)
    .maybeSingle()

  if (studentErr || !student) {
    return new Response(JSON.stringify({ error: 'no student profile found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let subjectName: string | null = null
  if (subjectId) {
    const { data: subjectRow } = await admin.from('subjects').select('name').eq('id', subjectId).maybeSingle()
    subjectName = subjectRow?.name ?? null
  }

  const since = windowSince(windowKey)
  const scope = await loadSubjectScope(admin, subjectId)
  const scopeIsEmpty = scope !== null && scope.topicIds.length === 0

  let tutorRows: any[] = []
  let quizRows: any[] = []
  let writtenRows: any[] = []

  if (!scopeIsEmpty) {
    let tutorQuery = admin
      .from('tutor_sessions')
      .select('started_at, completed_at, minutes_earned, message_count, messages, subtopics(name, topics(name, subjects(name)))')
      .eq('student_id', student.id)
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: false })
    if (since) tutorQuery = tutorQuery.gte('started_at', since)
    if (scope) tutorQuery = tutorQuery.in('subtopic_id', scope.subtopicIds)
    const { data, error } = await tutorQuery
    if (error) console.error('Failed to load tutor sessions for assessment', error)
    tutorRows = data || []

    let quizQuery = admin
      .from('quiz_sessions')
      .select('completed_at, score, question_count, quiz_format, topics(name, subjects(name))')
      .eq('student_id', student.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
    if (since) quizQuery = quizQuery.gte('completed_at', since)
    if (scope) quizQuery = quizQuery.in('topic_id', scope.topicIds)
    const { data: quizData, error: quizError } = await quizQuery
    if (quizError) console.error('Failed to load quiz sessions for assessment', quizError)
    quizRows = quizData || []

    if (!scope || scope.questionIds.length > 0) {
      let writtenQuery = admin
        .from('fm_attempts')
        .select('submitted_at, marks_awarded, total_marks, command_word_satisfied, feedback_summary, transcribed_answer, fm_exam_questions(question_text, command_word, topics(name, subjects(name)))')
        .eq('student_id', student.id)
        .not('marked_at', 'is', null)
        .order('submitted_at', { ascending: false })
      if (since) writtenQuery = writtenQuery.gte('submitted_at', since)
      if (scope) writtenQuery = writtenQuery.in('question_id', scope.questionIds)
      const { data: writtenData, error: writtenError } = await writtenQuery
      if (writtenError) console.error('Failed to load written test attempts for assessment', writtenError)
      writtenRows = writtenData || []
    }
  }

  const bundle = {
    studentName: student.display_name || 'the student',
    subjectFilter: subjectName ?? 'All subjects',
    window: windowKey,
    generatedAt: new Date().toISOString(),
    tutorSessions: tutorRows.map((r) => ({
      subject: r.subtopics?.topics?.subjects?.name ?? null,
      topic: r.subtopics?.topics?.name ?? null,
      subtopic: r.subtopics?.name ?? null,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      minutesEarned: r.minutes_earned,
      messageCount: r.message_count,
      transcript: Array.isArray(r.messages) ? r.messages : [],
    })),
    quizzes: quizRows.map((r) => ({
      subject: r.topics?.subjects?.name ?? null,
      topic: r.topics?.name ?? null,
      format: r.quiz_format,
      score: r.score,
      questionCount: r.question_count,
      completedAt: r.completed_at,
    })),
    writtenTests: writtenRows.map((r) => ({
      subject: r.fm_exam_questions?.topics?.subjects?.name ?? null,
      topic: r.fm_exam_questions?.topics?.name ?? null,
      questionText: r.fm_exam_questions?.question_text ?? null,
      commandWord: r.fm_exam_questions?.command_word ?? null,
      marksAwarded: r.marks_awarded,
      totalMarks: r.total_marks,
      commandWordSatisfied: r.command_word_satisfied,
      feedbackSummary: r.feedback_summary,
      studentAnswer: r.transcribed_answer,
      submittedAt: r.submitted_at,
    })),
  }

  async function saveAndRespond(status: 'complete' | 'error', result: unknown, errorMessage: string | null = null) {
    const { data: row, error } = await admin
      .from('assessments')
      .insert({
        subject_id: subjectId,
        time_window: windowKey,
        requested_by: parent!.id,
        status,
        result,
        error_message: errorMessage,
        data_bundle: bundle,
      })
      .select('id, requested_at')
      .single()

    if (error) {
      console.error('Failed to save assessment', error)
      return new Response(JSON.stringify({ error: 'failed to save assessment' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ id: row.id, requestedAt: row.requested_at, status, result }), {
      status: status === 'error' ? 502 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!hasEvidence(bundle)) {
    return saveAndRespond('complete', emptyEvidenceResult())
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const prompt = buildAssessmentPrompt({
    studentName: bundle.studentName,
    subjectLabel: bundle.subjectFilter,
    windowLabel: WINDOWS[windowKey as keyof typeof WINDOWS].label,
    bundle,
  })

  const assessRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
      tools: [
        {
          name: 'submit_assessment',
          description: 'Submit a structured progress assessment for the student',
          input_schema: {
            type: 'object',
            properties: {
              headline: { type: 'string', description: 'One sentence overall verdict' },
              strengths: { type: 'array', items: { type: 'string' }, description: 'Specific things the student is doing well, grounded in the evidence' },
              areasToImprove: { type: 'array', items: { type: 'string' }, description: 'Specific weak areas or gaps, grounded in the evidence' },
              recommendedActions: { type: 'array', items: { type: 'string' }, description: 'Concrete next steps for the student or parent' },
              narrative: { type: 'string', description: 'A short paragraph (3-5 sentences) giving the fuller picture' },
            },
            required: ['headline', 'strengths', 'areasToImprove', 'recommendedActions', 'narrative'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_assessment' },
    }),
  })

  if (!assessRes.ok) {
    console.error('Anthropic assessment error', assessRes.status, await assessRes.text())
    return saveAndRespond('error', null, 'assessment call failed')
  }

  const assessData = await assessRes.json()
  const result = extractAssessmentFromResponse(assessData)

  if (!result) {
    console.error('Malformed assessment response', JSON.stringify(assessData))
    return saveAndRespond('error', null, 'assessment response malformed')
  }

  return saveAndRespond('complete', result)
})
