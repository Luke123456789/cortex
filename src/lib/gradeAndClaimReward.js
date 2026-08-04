import { supabase } from './supabaseClient'

// Shared by any screen that needs to grade a tutor session and claim its
// reward (currently TutorChat.jsx; Phase 2's pop-quiz/longform surfaces will
// reuse this rather than duplicating the fetch/auth/error-shape logic).
export async function gradeAndClaimReward({ sessionId, messages, subjectName, topicName, subtopicName }) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  if (!authSession) throw new Error('Not signed in')

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grade-tutor-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authSession.access_token}`,
    },
    body: JSON.stringify({ sessionId, messages, subjectName, topicName, subtopicName }),
  })

  if (!res.ok) {
    throw new Error('Grading request failed')
  }

  return res.json()
}
