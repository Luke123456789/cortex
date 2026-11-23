import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.0'
import { getCaller, resolveWritableStudent } from '../_shared/access.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const ANTHROPIC_TIMEOUT_MS = 45_000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

// James's GCSEs: separate (triple) sciences; AQA except PE (OCR J587), History (Edexcel 1HI0) and Business (Eduqas C710).
const EXAM_BOARDS: Record<string, string> = {
  Biology: 'AQA GCSE Biology (8461)',
  Chemistry: 'AQA GCSE Chemistry (8462)',
  Physics: 'AQA GCSE Physics (8463)',
  Maths: 'AQA GCSE Mathematics (8300), Higher tier',
  Mathematics: 'AQA GCSE Mathematics (8300), Higher tier',
  History: 'Pearson Edexcel GCSE (9-1) History (1HI0)',
  Business: 'WJEC Eduqas GCSE (9-1) Business (C710)',
  Economics: 'AQA GCSE Economics (8136)',
  'Physical Education': 'OCR GCSE (9-1) Physical Education (J587)',
  PE: 'OCR GCSE (9-1) Physical Education (J587)',
  'English Literature': 'AQA GCSE English Literature (8702)',
  'English Language': 'AQA GCSE English Language (8700)',
}

// Papers where spelling, punctuation and grammar (SPaG) carry marks.
const SPAG_SUBJECTS = new Set(['English Literature', 'English Language', 'History'])

function buildPlanSummary(plan: any): string {
  if (!plan) return '(no lesson plan provided — improvise a sensible structure for this subtopic)'

  const outcomes = (plan.learningOutcomes ?? []).map((o: string) => `- ${o}`).join('\n')
  const sections = (plan.sections ?? [])
    .map((s: any, i: number) => `${i + 1}. ${s.heading}\n   Key points: ${(s.keyPoints ?? []).join('; ')}\n   Check-in question: ${s.checkIn}`)
    .join('\n')
  const essays = (plan.essayQuestions ?? [])
    .map((e: any, i: number) => `${i + 1}${i === 0 ? ' (COMPULSORY)' : ' (optional extra)'}. "${e.question}"${e.marks ? ` [${e.marks} marks]` : ''} — marking focus: ${e.markingFocus}`)
    .join('\n')

  return `LEARNING OUTCOMES FOR TODAY:\n${outcomes}\n\nCONTENT SECTIONS TO WORK THROUGH (use the conversation history to judge how far through you already are — don't repeat sections already covered):\n${sections}\n\nEXAM QUESTIONS TO POSE ONCE THE CONTENT HAS BEEN COVERED (one at a time):\n${essays}`
}

// Best-effort transcript persistence: append this turn onto
// tutor_sessions.messages. Uses the caller's JWT so RLS scopes it to their row.
async function appendTranscriptTurn(client: SupabaseClient, studentId: string, sessionId: string, userContent: string, assistantContent: string) {
  const { data: existing, error: fetchErr } = await client
    .from('tutor_sessions')
    .select('messages')
    .eq('id', sessionId)
    .eq('student_id', studentId)
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

  const caller = await getCaller(req)
  if (!caller) return json({ error: 'Please sign in again.' }, 401)

  const { subjectName, topicName, subtopicName, specRef, messages, lessonPlan, sessionId, studentId } = await req.json()
  // The student themselves, or a parent acting for their practice student.
  const user = await resolveWritableStudent(caller, studentId)
  if (!user) return json({ error: 'You can only chat as yourself or as your practice student.' }, 403)

  if (!Array.isArray(messages) || messages.length === 0) return json({ error: 'messages required' }, 400)

  // The API requires the first message to be from the user; the opening line
  // is an assistant message, so prepend a short user turn if needed.
  const apiMessages = messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }))
  if (apiMessages[0]?.role !== 'user') apiMessages.unshift({ role: 'user', content: "Hi, I'm ready to start." })

  const examBoardLine = EXAM_BOARDS[subjectName] ?? `GCSE ${subjectName ?? ''}`.trim()

  const systemPrompt = `You are a warm but demanding one-to-one ${examBoardLine} tutor, working by text chat with a UK student named ${user.displayName ?? 'the student'}.

Current focus: ${subjectName} > ${topicName} > ${subtopicName}${specRef ? ` (spec ref ${specRef})` : ''}.

${buildPlanSummary(lessonPlan)}

HOW TO RUN THE SESSION — THE STUDENT DOES THE THINKING:
- Ask before you tell. Open each section by asking what they already know or think, then build on their answer. Keep your explanations short; most of the words in this chat should be theirs.
- Every turn you send must end with ONE question that needs a real answer in their own words: "explain why", "how would you", "what would happen if", "talk me through". Never ask yes/no questions, "does that make sense?", "ready?" or anything answerable with "ok". In Maths and calculation topics, ask them to show the working, not just the final number.
- Keep each turn to 2-4 sentences, so it reads as a conversation, not a lecture.
- Hold the line on effort. If they reply "ok", "idk", "yes", a single word, or a vague fragment to a question that needed an explanation, do NOT move on and do NOT answer it for them. Briefly ask again for a fuller answer, and give a hint or a sentence starter if they're genuinely stuck ("Start with: the kettle heats more slowly because..."). If they say they don't know, break the question into a smaller step they can answer. Only move on once they've had a proper go.
- If an answer is partly wrong, say exactly which part and ask them to fix it themselves before you give the correction.
- Use the conversation history to track what's been covered — don't repeat yourself or re-ask something already answered properly.
- Once the three content sections are covered, pose the COMPULSORY exam question exactly as written, including the mark tariff, and tell them to write a full answer as if in the exam. Don't accept a one-line answer to a multi-mark question: ask them to develop it before you mark it.
- Stay strictly within ${subjectName} and this specification. Use the terminology, command words and mark-scheme expectations of ${examBoardLine}.

MARKING THE EXAM ANSWER:
When they've written their answer to the exam question, switch into marking mode for your next reply:
- Give a mark out of the tariff, e.g. "I'd give that 3/6", judged like a real ${examBoardLine} examiner — don't inflate it.
- Say specifically what earned credit, then the one or two concrete things that would have earned the missing marks: missing knowledge or key terms, applying it more directly to the question, developing the chain of reasoning, or reaching a judgement where the question asks for one. Say it the way a real teacher would — don't quote assessment-objective codes.${SPAG_SUBJECTS.has(subjectName) ? `
- This paper marks spelling, punctuation and grammar. Point out up to three misspelt words from their answer, prioritising subject key terms, and give the correct spelling.` : ''}
- Then offer a rewrite of their answer to improve the mark, or the optional second question. Tell them they've now done enough to press Finish to get their session graded, but that a rewrite or second question will earn more.

BEFORE THE SESSION IS COMPLETE:
If they ask to stop, finish or leave before they've answered the compulsory exam question, tell them plainly that the session only counts (and only earns screen time) once they've worked through the sections and written an answer to the exam question, and invite them to carry on.

GENERAL:
- Guide them to work answers out rather than giving them outright, except when marking a completed answer.
- Be encouraging without being saccharine. Talk to a teenager as a capable person, and expect real effort from them.
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
    await appendTranscriptTurn(caller.client, user.id, sessionId, latestUserMessage?.content ?? '', reply)
  }

  return json({ reply })
})
