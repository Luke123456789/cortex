import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')
const ELEVENLABS_VOICE_ID = Deno.env.get('ELEVENLABS_VOICE_ID') ?? '21m00Tcm4TlvDq8ikWAM'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

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

async function synthesizeSpeech(text: string): Promise<string | null> {
  if (!ELEVENLABS_API_KEY) return null
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': ELEVENLABS_API_KEY },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })
  if (!res.ok) {
    console.error('ElevenLabs TTS error', res.status, await res.text())
    return null
  }
  const audioBuffer = await res.arrayBuffer()
  const bytes = new Uint8Array(audioBuffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
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

// Best-effort transcript persistence: append this turn (latest user message +
// assistant reply) onto tutor_sessions.messages so the full session can be
// reviewed later. Uses the caller's own JWT so RLS scopes it to their row.
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
  const updatedMessages = [
    ...currentMessages,
    { role: 'user', content: userContent },
    { role: 'assistant', content: assistantContent },
  ]

  const { error: updateErr } = await client
    .from('tutor_sessions')
    .update({ messages: updatedMessages })
    .eq('id', sessionId)

  if (updateErr) console.error('Failed to persist tutor transcript', updateErr)
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

  const { subjectName, topicName, subtopicName, specRef, messages, lessonPlan, sessionId } = await req.json()

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const systemPrompt = `You are a warm, patient one-to-one GCSE Economics tutor, working with a UK student named ${user.displayName ?? 'the student'} on the AQA GCSE Economics (8136) specification, over a live SPOKEN voice call.

Current focus: ${subjectName} > ${topicName} > ${subtopicName} (spec ref ${specRef}).

${buildPlanSummary(lessonPlan)}

HOW TO RUN THE SESSION:
- You have a lesson plan above. Teach through it like a real tutor would: explain a section's key points in your own words (don't read them out as a list), then ask the check-in question for that section before moving to the next one. Use the conversation history to track what's already been covered — don't repeat yourself or re-ask something already answered.
- Keep each turn short — 2–4 sentences at a time, since this is spoken aloud, not read on a screen.
- Invite examples and questions from the student naturally as you go, not just at fixed checkpoints.
- Once the content sections feel covered, pose ONE of the essay questions from the plan, phrased conversationally (e.g. "Let's try something exam-style — ...").

MARKING AN ESSAY ANSWER — this is important:
When the student gives a longer, essay-style spoken answer to one of the essay questions, switch into marking mode for your next reply:
- Start by acknowledging what was genuinely good or correct in their answer — be specific, not generic praise.
- Then tell them concretely what would lift the answer further for GCSE marks: is there a definition or fact missing (knowledge)? Could they apply it more directly to the question's context (application)? Could they explain the chain of effects, or weigh up both sides, or reach a judgement (analysis/evaluation)? Reference these ideas in plain spoken language — don't say "AO1" or "AO2" out loud, translate that into what a real teacher would actually say.
- Keep the marking feedback focused and actionable — one or two concrete improvements, not an exhaustive list.
- After marking, ask if they'd like to try again with the feedback in mind, move to the second essay question if there is one, or wrap up.

GENERAL:
- Never do their homework answers for them outright — guide them to work it out, except when specifically marking a completed answer as above.
- Be encouraging without being saccharine. Talk to a teenager like a capable person, not a small child.
- Write plainly, since this becomes spoken audio: no bullet points, no markdown, no asterisks, spell out numbers under twenty.`

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
    }),
  })

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text()
    console.error('Anthropic API error', anthropicRes.status, errText)
    return new Response(JSON.stringify({ error: 'tutor call failed' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const data = await anthropicRes.json()
  const reply = data.content?.map((block: { text?: string }) => block.text ?? '').join('') ?? ''

  const audioBase64 = await synthesizeSpeech(reply)

  if (sessionId) {
    const latestUserMessage = messages[messages.length - 1]
    await appendTranscriptTurn(user.client, sessionId, latestUserMessage?.content ?? '', reply)
  }

  return new Response(JSON.stringify({ reply, audioBase64 }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
