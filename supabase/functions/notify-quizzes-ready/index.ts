import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:example@example.com'
const TRIGGER_SECRET = Deno.env.get('MANUAL_NOTIFY_SECRET')

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Manually-triggered notification (not a DB webhook) — used to nudge the
// student that fresh quiz content is available. Requires a shared secret
// header so only an authorised caller (e.g. Claude via curl, or a future
// parent-facing "send reminder" button) can fire it.
Deno.serve(async (req) => {
  if (TRIGGER_SECRET && req.headers.get('x-trigger-secret') !== TRIGGER_SECRET) {
    return new Response('unauthorized', { status: 401 })
  }

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('role', 'student')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!subscriptions || subscriptions.length === 0) {
    return new Response(JSON.stringify({ sent: 0, note: 'no student subscriptions registered yet' }), { status: 200 })
  }

  const message = JSON.stringify({
    title: 'Cortex',
    body: 'New Economics quizzes are up — earn some screen time.',
    url: '/quizzes',
  })

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message
      )
    )
  )

  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length) console.error('Some push sends failed', failed)

  return new Response(JSON.stringify({ sent: results.length - failed.length, failed: failed.length }), {
    status: 200,
  })
})
