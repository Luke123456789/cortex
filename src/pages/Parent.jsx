import { useEffect, useState } from 'react'
import { useRedemptions } from '../hooks/useRedemptions'
import { useLedger } from '../hooks/useLedger'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabaseClient'
import RoleSwitch from '../components/RoleSwitch.jsx'
import WeakAreas from '../components/WeakAreas.jsx'
import LedgerList from '../components/LedgerList.jsx'
import { getExistingSubscription, subscribeToPush, ensureSubscriptionSaved, pushSupported } from '../lib/push.js'

function formatTime(isoString) {
  return new Date(isoString).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function Parent() {
  const { requests, refresh } = useRedemptions()
  const { entries } = useLedger()
  const { signOut } = useAuth()
  const [notifStatus, setNotifStatus] = useState('checking')

  useEffect(() => {
    if (!pushSupported()) {
      setNotifStatus('unsupported')
      return
    }
    getExistingSubscription().then((sub) => {
      if (!sub) {
        setNotifStatus('disabled')
        return
      }
      // Browser thinks we're subscribed, but confirm the DB row actually
      // exists too — it can go missing independently (e.g. a table reset)
      // without the browser subscription itself being affected.
      ensureSubscriptionSaved()
        .then(() => setNotifStatus('enabled'))
        .catch((err) => {
          console.error('Failed to confirm subscription', err)
          setNotifStatus('enabled')
        })
    })
  }, [])

  async function handleEnableNotifications() {
    setNotifStatus('requesting')
    try {
      await subscribeToPush()
      setNotifStatus('enabled')
    } catch (err) {
      console.error('Failed to enable notifications', err)
      setNotifStatus('disabled')
    }
  }

  async function approve(request) {
    const { error: insertError } = await supabase.from('ledger_entries').insert({
      type: 'spend',
      amount_minutes: request.minutes_requested,
      source: 'Redemption approved',
    })
    if (insertError) {
      console.error('Failed to log spend', insertError)
      return
    }

    const { error: updateError } = await supabase
      .from('redemption_requests')
      .update({ status: 'approved', resolved_at: new Date().toISOString() })
      .eq('id', request.id)

    if (updateError) console.error('Failed to update request', updateError)
    refresh()
  }

  async function deny(request) {
    const { error } = await supabase
      .from('redemption_requests')
      .update({ status: 'denied', resolved_at: new Date().toISOString() })
      .eq('id', request.id)
    if (error) console.error('Failed to update request', error)
    refresh()
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending')
  const resolvedRequests = requests.filter((r) => r.status !== 'pending')

  return (
    <div className="device">
      <div className="screen">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div className="wordmark">CORTEX</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <RoleSwitch view="parent" />
            <button
              onClick={signOut}
              style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--ink-faint)', textDecoration: 'underline', padding: 0 }}
            >
              Sign out
            </button>
          </div>
        </div>
        <div className="mono" style={{ fontSize: '10px', letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: '16px' }}>
          Parent approvals
        </div>

        {notifStatus === 'disabled' && (
          <button
            onClick={handleEnableNotifications}
            style={{
              width: '100%',
              background: 'var(--brass-light)',
              color: 'var(--brass)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '12.5px',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            Enable notifications on this device
          </button>
        )}
        {notifStatus === 'enabled' && (
          <div style={{ fontSize: '11.5px', color: 'var(--ink-faint)', marginBottom: '20px' }}>
            Notifications are on for this device.
          </div>
        )}
        {notifStatus === 'unsupported' && (
          <div style={{ fontSize: '11.5px', color: 'var(--ink-faint)', marginBottom: '20px' }}>
            This browser doesn't support push notifications.
          </div>
        )}

        <WeakAreas />

        <div className="section-label">Pending</div>
        {pendingRequests.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)', marginBottom: '20px' }}>Nothing waiting on you.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius)',
                  padding: '14px 15px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span className="mono" style={{ fontSize: '15px', fontWeight: 600 }}>{request.minutes_requested} min</span>
                  <span className="mono" style={{ fontSize: '10.5px', color: 'var(--ink-faint)' }}>{formatTime(request.requested_at)}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => deny(request)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: '1px solid var(--rule-strong)',
                      borderRadius: '8px',
                      padding: '9px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--red)',
                    }}
                  >
                    Deny
                  </button>
                  <button
                    onClick={() => approve(request)}
                    style={{
                      flex: 1,
                      background: 'var(--ink)',
                      color: 'var(--paper)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '9px',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="section-label">Recent</div>
        {resolvedRequests.slice(0, 8).map((request) => (
          <div
            key={request.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid var(--rule)',
            }}
          >
            <div>
              <div style={{ fontSize: '13.5px' }}>{request.minutes_requested} min requested</div>
              <span className="mono" style={{ fontSize: '9.5px', color: 'var(--ink-faint)' }}>{formatTime(request.requested_at)}</span>
            </div>
            <span
              className="mono"
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: request.status === 'approved' ? 'var(--green)' : 'var(--red)',
              }}
            >
              {request.status}
            </span>
          </div>
        ))}

        <div className="section-label" style={{ marginTop: '20px' }}>Activity feed</div>
        <LedgerList entries={entries} />
      </div>
    </div>
  )
}
