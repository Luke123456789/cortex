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
  // The Supabase database webhook sends a header you configure yourself when
  // you set the webhook up. This checks it matches, so nobody outside your
  // project can trigger a push by hitting the function URL directly.
  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('unauthorized', { status: 401 })
  }

  const payload = await req.json()
  const record = payload.record

  if (!record || record.status !== 'pending') {
    return new Response('ignored', { status: 200 })
  }

  // Practice requests are made by the parent themselves: nobody to notify.
  const { data: student } = await supabase
    .from('profiles')
    .select('display_name, is_practice')
    .eq('id', record.student_id)
    .maybeSingle()
  if (!student || student.is_practice) {
    return new Response('ignored (practice or unknown student)', { status: 200 })
  }

  // Only the student's linked parents. A redemption request is submitted BY
  // the student, so the student's own subscriptions must never be pinged.
  const { data: links } = await supabase
    .from('student_links')
    .select('parent_id')
    .eq('student_id', record.student_id)
  const parentIds = (links ?? []).map((l) => l.parent_id)

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('role', 'parent')
    .in('user_id', parentIds)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const message = JSON.stringify({
    title: 'Cortex — redemption request',
    body: `${student.display_name ?? 'Your student'} wants to redeem ${record.minutes_requested} min`,
    url: '/parent',
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
