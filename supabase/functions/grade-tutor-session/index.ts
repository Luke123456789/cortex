import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { MIN_MINUTES, MAX_MINUTES, buildGradingPrompt, extractGradeFromResponse } from './grading-logic.js'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
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
  const { data: profile } = await supabase.from('profiles').select('role, display_name').eq('id', user.id).single()
  if (profile?.role !== 'student') return null
  return { id: user.id, displayName: profile.display_name, client: supabase }
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

  const user = await getStudentUser(req)
  if (!user) return new Response('unauthorized', { status: 401, headers: corsHeaders })

  const { sessionId, messages, subjectName, topicName, subtopicName } = await req.json()
  if (!sessionId || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'sessionId and messages required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Ownership check: the session must belong to this student. Uses the
  // caller's own JWT (RLS-scoped), not the service-role client, so this can
  // never read or grade someone else's session.
  const { data: session, error: sessionErr } = await user.client
    .from('tutor_sessions')
    .select('id, student_id, reward_claimed')
    .eq('id', sessionId)
    .eq('student_id', user.id)
    .single()

  if (sessionErr || !session) {
    return new Response(JSON.stringify({ error: 'session not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  if (session.reward_claimed) {
    return new Response(JSON.stringify({ claimed: false, alreadyClaimed: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const transcriptText = messages
    .filter((m: { role: string; content: string }) => m.role === 'user')
    .map((m: { content: string }) => m.content)
    .join('\n\n')

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
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
      tools: [
        {
          name: 'submit_grade',
          description: 'Submit the grading result for this tutoring session',
          input_schema: {
            type: 'object',
            properties: {
              minutes: {
                type: 'integer',
                minimum: MIN_MINUTES,
                maximum: MAX_MINUTES,
                description: `Minutes of screen time earned, ${MIN_MINUTES} (minimal engagement) to ${MAX_MINUTES} (excellent, thorough reasoning)`,
              },
              feedback: {
                type: 'string',
                description: 'One or two sentences of feedback for the student, specific to what they did well or should improve',
              },
            },
            required: ['minutes', 'feedback'],
          },
        },
      ],
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

  const { minutes, feedback } = grade

  // Service-role client: the only caller allowed to execute
  // grade_and_claim_tutor_reward. Never exposed to the browser.
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: claimResult, error: claimErr } = await serviceClient
    .rpc('grade_and_claim_tutor_reward', { p_session_id: sessionId, p_minutes: minutes })
    .single()

  if (claimErr) {
    console.error('grade_and_claim_tutor_reward error', claimErr)
    return new Response(JSON.stringify({ error: 'reward claim failed' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({
    claimed: claimResult?.claimed ?? false,
    minutesAwarded: claimResult?.minutes_awarded ?? null,
    feedback,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
