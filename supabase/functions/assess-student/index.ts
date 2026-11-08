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
import { getCaller, resolveParentedStudent } from '../_shared/access.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  const parent = await getCaller(req)
  if (!parent || parent.role !== 'parent') return new Response('unauthorized', { status: 401, headers: corsHeaders })

  const { subjectId = null, window: windowKey, studentId } = await req.json()
  if (!isValidWindow(windowKey)) {
    return new Response(JSON.stringify({ error: 'invalid window' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // A student this parent is linked to (checked with the parent's own JWT).
  // Without studentId: the parent's one linked real student, as before.
  const linked = await resolveParentedStudent(parent, studentId)
  if (!linked) {
    return new Response(JSON.stringify({ error: 'no linked student found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Service-role client: this aggregation reads the linked student's whole
  // history in one go, and is the only place that inserts the final
  // assessments row. Every query below is filtered to student.id.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const student = { id: linked.id, display_name: linked.displayName }

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
        student_id: student.id,
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

  // A garbled tool call is occasional and random, so try up to 3 times.
  const MAX_ATTEMPTS = 3
  let result = null
  let callFailed = false
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !result; attempt++) {
  const assessRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 2500,
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
    console.error(`Anthropic assessment error (attempt ${attempt})`, assessRes.status, await assessRes.text())
    callFailed = true
    continue
  }

  const assessData = await assessRes.json()
  result = extractAssessmentFromResponse(assessData)
  if (!result) console.error(`Malformed assessment response (attempt ${attempt})`, JSON.stringify(assessData))
  }

  if (!result) {
    return saveAndRespond('error', null, callFailed ? 'assessment call failed' : 'assessment response malformed')
  }

  return saveAndRespond('complete', result)
})
