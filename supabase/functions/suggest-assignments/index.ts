// Suggests work for a parent to assign: looks at what the student has been
// avoiding or struggling with, and picks from the real catalog of quizzes and
// tutor lessons. Read-only: nothing is assigned here; the parent ticks what
// they want and the app inserts the assignments as it does on Assign work.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import {
  buildStats,
  buildCandidates,
  hasCandidates,
  buildSuggestionPrompt,
  extractSuggestions,
  SUGGESTION_TOOL,
} from './suggestion-logic.js'
import { getCaller, resolveParentedStudent } from '../_shared/access.ts'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: corsHeaders })

  const parent = await getCaller(req)
  if (!parent || parent.role !== 'parent') return new Response('unauthorized', { status: 401, headers: corsHeaders })

  const { studentId } = await req.json().catch(() => ({}))
  // A student this parent is linked to, checked with the parent's own JWT.
  const student = await resolveParentedStudent(parent, studentId)
  if (!student) return json({ error: 'no linked student found' }, 404)

  // Service role for the reads; every student-scoped query is filtered to
  // student.id, and this function writes nothing.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const [subjectsRes, topicsRes, subtopicsRes, quizzesRes, quizSessionsRes, tutorRes, pendingRes, locksRes] = await Promise.all([
    admin.from('subjects').select('id, name, exam_board').order('name'),
    admin.from('topics').select('id, subject_id, name, display_order').order('display_order'),
    admin.from('subtopics').select('id, topic_id, name, display_order').order('display_order'),
    admin.from('quizzes').select('id, topic_id, title, question_count, display_order').gt('question_count', 0),
    admin.from('quiz_sessions').select('quiz_id, topic_id, score, question_count, completed_at').eq('student_id', student.id).not('completed_at', 'is', null),
    admin.from('tutor_sessions').select('subtopic_id, minutes_earned, completed_at').eq('student_id', student.id).not('completed_at', 'is', null),
    admin.from('assignments').select('title, quiz_id, subtopic_id').eq('student_id', student.id).eq('status', 'pending'),
    admin.from('subject_locks').select('subject_id, topic_id, locked_until').eq('student_id', student.id),
  ])
  for (const [name, res] of Object.entries({ subjectsRes, topicsRes, subtopicsRes, quizzesRes, quizSessionsRes, tutorRes, pendingRes, locksRes })) {
    if (res.error) {
      console.error(`suggest-assignments: failed to load ${name}`, res.error)
      return json({ error: 'failed to load activity' }, 500)
    }
  }

  const input = {
    subjects: subjectsRes.data!,
    topics: topicsRes.data!,
    subtopics: subtopicsRes.data!,
    quizzes: quizzesRes.data!,
    quizSessions: quizSessionsRes.data!,
    tutorSessions: tutorRes.data!,
    pendingAssignments: pendingRes.data!,
    locks: locksRes.data!,
  }
  const { subjectStats, topicStats } = buildStats(input)
  const candidates = buildCandidates(input)
  if (!hasCandidates(candidates)) return json({ overview: 'Everything available is already assigned or locked.', suggestions: [] })

  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500)

  const prompt = buildSuggestionPrompt({
    studentName: student.displayName || 'the student',
    subjectStats,
    topicStats,
    candidates,
    pendingAssignments: input.pendingAssignments,
  })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
      tools: [SUGGESTION_TOOL],
      tool_choice: { type: 'tool', name: SUGGESTION_TOOL.name },
    }),
  })
  if (!res.ok) {
    console.error('suggest-assignments: Anthropic error', res.status, await res.text())
    return json({ error: 'suggestion call failed' }, 502)
  }

  const data = await res.json()
  const result = extractSuggestions(data, candidates)
  if (!result) {
    console.error('suggest-assignments: malformed response', JSON.stringify(data))
    return json({ error: 'suggestion response malformed' }, 502)
  }
  return json(result)
})
