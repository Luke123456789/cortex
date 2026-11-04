import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// Fail fast rather than leaving the student staring at a spinner.
const ANTHROPIC_TIMEOUT_MS = 60_000

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
  return { id: user.id, displayName: profile.display_name }
}

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

// Structured output via a forced tool call — no more scraping JSON out of
// free text, which broke whenever the reply was truncated or wrapped in prose.
const LESSON_PLAN_TOOL = {
  name: 'submit_lesson_plan',
  description: 'Submit the lesson plan for this tutoring session',
  input_schema: {
    type: 'object',
    properties: {
      learningOutcomes: { type: 'array', items: { type: 'string' }, description: '2-3 outcomes, each starting "By the end of this you\'ll be able to..."' },
      sections: {
        type: 'array',
        description: '2-3 teaching sections',
        items: {
          type: 'object',
          properties: {
            heading: { type: 'string' },
            keyPoints: { type: 'array', items: { type: 'string' }, description: '2-4 concise talking points' },
            checkIn: { type: 'string', description: 'A conversational question to check understanding' },
          },
          required: ['heading', 'keyPoints', 'checkIn'],
        },
      },
      essayQuestions: {
        type: 'array',
        description: '1-2 GCSE-style extended-response questions',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            markingFocus: { type: 'string', description: 'What a strong answer needs for top marks' },
          },
          required: ['question', 'markingFocus'],
        },
      },
      openingLine: { type: 'string', description: 'A short, warm opening message (1-2 sentences) naming the subtopic and what they will cover' },
    },
    required: ['learningOutcomes', 'sections', 'essayQuestions', 'openingLine'],
  },
}

function isValidPlan(p: any) {
  return p && typeof p.openingLine === 'string' && p.openingLine.length > 0 &&
    Array.isArray(p.sections) && p.sections.length > 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  if (!ANTHROPIC_API_KEY) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500)

  const user = await getStudentUser(req)
  if (!user) return json({ error: 'Please sign in again as the student.' }, 401)

  const { subjectName, topicName, subtopicName, specRef } = await req.json()
  if (!subtopicName) return json({ error: 'subtopicName required' }, 400)

  const examBoardLine = EXAM_BOARDS[subjectName] ?? `GCSE ${subjectName ?? ''}`.trim()

  const planPrompt = `You are an experienced ${examBoardLine} teacher preparing a short one-to-one tutoring session for a student named ${user.displayName ?? 'the student'}.

Subject: ${subjectName}
Topic: ${topicName}
Subtopic: ${subtopicName}${specRef ? ` (spec ref ${specRef})` : ''}

Plan a conversational, text-based one-to-one session of roughly 10-15 minutes.
- 2-3 learning outcomes
- 2-3 sections, each with 2-4 concise talking points (for the tutor, not a script) and one natural check-in question
- 1-2 GCSE-level (not A-level) extended-response questions genuinely testing this subtopic, phrased as they would appear on the ${examBoardLine} paper, each with a note on what earns top marks
- A short, friendly opening message

Call submit_lesson_plan with the plan.`

  let planRes: Response
  try {
    planRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: planPrompt }],
        tools: [LESSON_PLAN_TOOL],
        tool_choice: { type: 'tool', name: 'submit_lesson_plan' },
      }),
    })
  } catch (err) {
    console.error('Anthropic plan request threw', err)
    return json({ error: 'The tutor took too long to prepare the lesson.' }, 504)
  }

  if (!planRes.ok) {
    console.error('Anthropic plan generation error', planRes.status, await planRes.text())
    return json({ error: 'The tutor could not prepare the lesson.' }, 502)
  }

  const planData = await planRes.json()
  const plan = planData.content?.find((b: { type: string }) => b.type === 'tool_use')?.input

  if (!isValidPlan(plan)) {
    console.error('Malformed lesson plan', JSON.stringify(planData).slice(0, 2000))
    return json({ error: 'The lesson plan came back incomplete.' }, 502)
  }

  return json({ plan })
})
