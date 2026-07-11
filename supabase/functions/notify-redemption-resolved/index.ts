import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:example@example.com'
const WEBHOOK_SECRET = Deno.env.get('REDEMPTION_WEBHOOK_SECRET')

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('unauthorized', { status: 401 })
  }

  const payload = await req.json()
  const record = payload.record
  const oldRecord = payload.old_record

  // Only fire when status actually changed away from pending, not on every update.
  if (!record || record.status === 'pending' || record.status === oldRecord?.status) {
    return new Response('ignored', { status: 200 })
  }

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('role', 'student')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const message = JSON.stringify({
    title: record.status === 'approved' ? 'Redemption approved' : 'Redemption denied',
    body:
      record.status === 'approved'
        ? `${record.minutes_requested} min approved — go ahead`
        : `${record.minutes_requested} min was denied`,
    url: '/',
  })

  const results = await Promise.allSettled(
    (subscriptions ?? []).map((sub) =>
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
