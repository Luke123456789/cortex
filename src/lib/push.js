import { supabase } from './supabaseClient'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.register('/sw.js')
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getExistingSubscription() {
  if (!pushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

// Role is deliberately never passed in by the caller — it's looked up from
// the signed-in user's own profile row, so which page happened to be open
// when the button was tapped can't affect what role a subscription gets.
async function getCurrentUserAndRole() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('You need to be signed in to enable notifications.')

  const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (error) throw error

  return { userId: user.id, role: data.role }
}

async function saveSubscription(subscription) {
  const { role } = await getCurrentUserAndRole()
  const json = subscription.toJSON()
  // Uses an RPC rather than a direct upsert: if this device's endpoint was
  // previously registered under a different account (e.g. tested as parent,
  // now logged in as student), a plain upsert would be blocked by RLS since
  // the existing row belongs to someone else. The RPC explicitly reassigns
  // ownership to whoever's currently signed in.
  const { error } = await supabase.rpc('claim_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
    p_role: role,
  })
  if (error) throw error
}

export async function ensureSubscriptionSaved() {
  const subscription = await getExistingSubscription()
  if (!subscription) return false
  await saveSubscription(subscription)
  return true
}

export async function subscribeToPush() {
  if (!pushSupported()) {
    throw new Error('Push notifications are not supported in this browser.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.')
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    throw new Error('VITE_VAPID_PUBLIC_KEY is not set.')
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  })

  await saveSubscription(subscription)
  return subscription
}
