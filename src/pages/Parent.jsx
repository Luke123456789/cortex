import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRedemptions } from '../hooks/useRedemptions'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabaseClient'
import ExamCountdown from '../components/ExamCountdown.jsx'
import SubjectLocks from '../components/SubjectLocks.jsx'
import styles from './Parent.module.css'
import { getExistingSubscription, subscribeToPush, ensureSubscriptionSaved, pushSupported } from '../lib/push.js'

function formatTime(isoString) {
  return new Date(isoString).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function Parent() {
  const { childStudent } = useAuth()
  const { requests, refresh } = useRedemptions(childStudent?.id)
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
      student_id: request.student_id,
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

  return (
    <div className="page page--wide">
      <h1 className={`section-label ${styles.title}`}>Parent approvals</h1>

      {pendingRequests.length > 0 && (
        <section className={styles.requests} aria-labelledby="parent-requests">
          <h2 id="parent-requests" className={`section-label ${styles.requestsTitle}`}>
            New request{pendingRequests.length > 1 ? 's' : ''}
          </h2>
          <ul className={styles.requestList}>
            {pendingRequests.map((request) => (
              <li key={request.id} className={styles.request}>
                <div className={styles.requestTop}>
                  <span className={styles.minutes}>{request.minutes_requested} min</span>
                  <span className="meta">{formatTime(request.requested_at)}</span>
                </div>
                <div className={styles.requestActions}>
                  <button type="button" className={`btn btn--secondary ${styles.deny}`} onClick={() => deny(request)}>
                    Deny
                  </button>
                  <button type="button" className="btn btn--primary" onClick={() => approve(request)}>
                    Approve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notifStatus === 'disabled' && (
        <button type="button" className={`btn btn--soft btn--block ${styles.notif}`} onClick={handleEnableNotifications}>
          Enable notifications on this device
        </button>
      )}
      {notifStatus === 'enabled' && (
        <p className={`${styles.notif} ${styles.notifText}`}>Notifications are on for this device.</p>
      )}
      {notifStatus === 'unsupported' && (
        <p className={`${styles.notif} ${styles.notifText}`}>This browser doesn't support push notifications.</p>
      )}

      <div className={styles.layout}>
        <div className={styles.main}>
          <ExamCountdown detailed />
          <SubjectLocks studentId={childStudent?.id} />
        </div>

        <nav className={styles.side} aria-labelledby="parent-actions">
          <h2 id="parent-actions" className={`section-label ${styles.actionsTitle}`}>Quick actions</h2>
          <ul className={styles.actions}>
            <li><Link to="/parent/assign" className="btn btn--primary">Assign work</Link></li>
            <li><Link to="/parent/analytics" className="btn btn--primary">Analytics</Link></li>
            <li><Link to="/parent/tutor-sessions" className="btn btn--secondary">Review tutor sessions</Link></li>
            <li><Link to="/parent/redemptions" className="btn btn--secondary">View Recent Redemptions</Link></li>
          </ul>
        </nav>
      </div>
    </div>
  )
}
