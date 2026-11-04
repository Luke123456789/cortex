import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const ANTHROPIC_TIMEOUT_MS = 45_000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

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

const EXAM_BOARDS: Record<string, string> = {
  Economics: 'AQA GCSE Economics (8136)',
  Biology: 'AQA GCSE Biology (8461)',
  Chemistry: 'AQA GCSE Chemistry (8462)',
  'Physical Education': 'AQA GCSE Physical Education (8582)',
  'English Literature': 'AQA GCSE English Literature (8702)',
}

function buildPlanSummary(plan: any): string {
  if (!plan) return '(no lesson plan provided — improvise a sensible structure for this subtopic)'

  const outcomes = (plan.learningOutcomes ?? []).map((o: string) => `- ${o}`).join('\n')
  const sections = (plan.sections ?? [])
    .map((s: any, i: number) => `${i + 1}. ${s.heading}\n   Key points: ${(s.keyPoints ?? []).join('; ')}\n   Check-in question: ${s.checkIn}`)
    .join('\n')
  const essays = (plan.essayQuestions ?? [])
    .map((e: any, i: number) => `${i + 1}. "${e.question}" — marking focus: ${e.markingFocus}`)
    .join('\n')

  return `LEARNING OUTCOMES FOR TODAY:\n${outcomes}\n\nCONTENT SECTIONS TO WORK THROUGH (use the conversation history to judge how far through you already are — don't repeat sections already covered):\n${sections}\n\nESSAY QUESTIONS TO POSE ONCE THE CONTENT HAS BEEN COVERED (pick one at a time, not both at once):\n${essays}`
}

// Best-effort transcript persistence: append this turn onto
// tutor_sessions.messages. Uses the caller's JWT so RLS scopes it to their row.
async function appendTranscriptTurn(client: ReturnType<typeof createClient>, sessionId: string, userContent: string, assistantContent: string) {
  const { data: existing, error: fetchErr } = await client
    .from('tutor_sessions')
    .select('messages')
    .eq('id', sessionId)
    .single()

  if (fetchErr) {
    console.error('Failed to load tutor session for transcript persistence', fetchErr)
    return
  }

  const currentMessages = Array.isArray(existing?.messages) ? existing.messages : []
  const { error: updateErr } = await client
    .from('tutor_sessions')
    .update({
      messages: [
        ...currentMessages,
        { role: 'user', content: userContent },
        { role: 'assistant', content: assistantContent },
      ],
    })
    .eq('id', sessionId)

  if (updateErr) console.error('Failed to persist tutor transcript', updateErr)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500)

  const user = await getStudentUser(req)
  if (!user) return json({ error: 'Please sign in again as the student.' }, 401)

  const { subjectName, topicName, subtopicName, specRef, messages, lessonPlan, sessionId } = await req.json()

  if (!Array.isArray(messages) || messages.length === 0) return json({ error: 'messages required' }, 400)

  // The API requires the first message to be from the user; the opening line
  // is an assistant message, so prepend a short user turn if needed.
  const apiMessages = messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }))
  if (apiMessages[0]?.role !== 'user') apiMessages.unshift({ role: 'user', content: "Hi, I'm ready to start." })

  const examBoardLine = EXAM_BOARDS[subjectName] ?? `GCSE ${subjectName ?? ''}`.trim()

  const systemPrompt = `You are a warm, patient one-to-one ${examBoardLine} tutor, working by text chat with a UK student named ${user.displayName ?? 'the student'}.

Current focus: ${subjectName} > ${topicName} > ${subtopicName}${specRef ? ` (spec ref ${specRef})` : ''}.

${buildPlanSummary(lessonPlan)}

HOW TO RUN THE SESSION:
- Teach through the lesson plan like a real tutor: explain a section's key points in your own words, then ask that section's check-in question before moving on. Use the conversation history to track what's been covered — don't repeat yourself or re-ask something already answered.
- Keep each turn short — 2-4 sentences — so it reads as a conversation, not a lecture.
- Invite examples and questions naturally as you go.
- Once the content sections are covered, pose ONE of the essay questions from the plan (e.g. "Let's try something exam-style — ...").
- Stay strictly within ${subjectName} and this specification. Use the terminology, command words and mark-scheme expectations of ${examBoardLine}.

MARKING AN ESSAY ANSWER:
When the student gives a longer, exam-style answer, switch into marking mode for your next reply:
- First say specifically what was genuinely good or correct.
- Then give one or two concrete improvements that would earn more marks on this paper: missing knowledge or key terms, applying it more directly to the question, developing the chain of reasoning, or weighing up and reaching a judgement where the question asks for it. Say it the way a real teacher would — don't quote assessment-objective codes.
- Then offer to let them try again, move to the second essay question, or wrap up.

GENERAL:
- Guide them to work answers out rather than giving them outright, except when marking a completed answer.
- Be encouraging without being saccharine. Talk to a teenager as a capable person.
- Plain text only: no markdown, bullet points or asterisks.`

  let anthropicRes: Response
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 700,
        system: systemPrompt,
        messages: apiMessages,
      }),
    })
  } catch (err) {
    console.error('Anthropic request threw', err)
    return json({ error: 'The tutor took too long to reply.' }, 504)
  }

  if (!anthropicRes.ok) {
    console.error('Anthropic API error', anthropicRes.status, await anthropicRes.text())
    return json({ error: 'The tutor could not reply.' }, 502)
  }

  const data = await anthropicRes.json()
  const reply = (data.content ?? []).map((b: { text?: string }) => b.text ?? '').join('').trim()
  if (!reply) {
    console.error('Empty tutor reply', JSON.stringify(data).slice(0, 1000))
    return json({ error: 'The tutor sent an empty reply.' }, 502)
  }

  if (sessionId) {
    const latestUserMessage = messages[messages.length - 1]
    await appendTranscriptTurn(user.client, sessionId, latestUserMessage?.content ?? '', reply)
  }

  return json({ reply })
})
