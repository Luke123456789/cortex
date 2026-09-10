import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLedger } from '../hooks/useLedger'
import { useRedemptions } from '../hooks/useRedemptions'
import { useAssignments } from '../hooks/useAssignments'
import { useAuth } from '../hooks/useAuth.jsx'
import { ASSIGNMENT_TYPE_LABELS, assignmentAction } from '../lib/assignments'
import BalanceCard from '../components/BalanceCard.jsx'
import ExamCountdown from '../components/ExamCountdown.jsx'
import LedgerList from '../components/LedgerList.jsx'
import ChallengeList from '../components/ChallengeList.jsx'
import RedeemModal from '../components/RedeemModal.jsx'
import RoleSwitch from '../components/RoleSwitch.jsx'
import { getExistingSubscription, subscribeToPush, ensureSubscriptionSaved, pushSupported } from '../lib/push.js'

export default function Home() {
  const { entries, balance, loading } = useLedger()
  const { pending, refresh: refreshRedemptions } = useRedemptions()
  const { assignments } = useAssignments()
  const pendingAssignments = assignments.filter((a) => a.status === 'pending')
  const { profile, signOut } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
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

  return (
    <div className="device">
      <div className="screen">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '22px' }}>
          <div>
            <div className="wordmark">CORTEX</div>
            <div className="mono" style={{ fontSize: '10px', letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--ink-soft)', marginTop: '3px' }}>
              GCSE Revision
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <RoleSwitch view="student" />
            <button
              onClick={signOut}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '11px',
                color: 'var(--ink-faint)',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              {profile?.display_name ? `${profile.display_name} · Sign out` : 'Sign out'}
            </button>
          </div>
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
              marginBottom: '18px',
            }}
          >
            Enable notifications on this device
          </button>
        )}
        {loading ? (
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>Loading…</div>
        ) : (
          <>
            <ExamCountdown />

            <BalanceCard balance={balance} pendingRequest={pending} onRedeemClick={() => setModalOpen(true)} />

            {pendingAssignments.length > 0 && (
              <>
                <div className="section-label">Assigned work</div>
                <div style={{ display: 'grid', gap: '8px', marginBottom: '18px' }}>
                  {pendingAssignments.slice(0, 3).map((a) => {
                    const action = assignmentAction(a)
                    return (
                      <div
                        key={a.id}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '11px 13px' }}
                      >
                        <div>
                          <div style={{ fontSize: '13.5px' }}>{a.title}</div>
                          <span className="mono" style={{ fontSize: '9.5px', color: 'var(--ink-faint)' }}>{ASSIGNMENT_TYPE_LABELS[a.type] || a.type}</span>
                        </div>
                        {action ? (
                          <Link
                            to={action.to}
                            style={{ flexShrink: 0, background: 'var(--ink)', color: 'var(--paper)', borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
                          >
                            {action.label}
                          </Link>
                        ) : (
                          <span className="mono" style={{ flexShrink: 0, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Soon</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                {pendingAssignments.length > 3 && (
                  <Link to="/assignments" style={{ display: 'inline-block', fontSize: '12px', color: 'var(--brass)', textDecoration: 'underline', marginBottom: '18px' }}>
                    View more
                  </Link>
                )}
              </>
            )}

            <div className="tear">
              <div className="tear-hole" /><span /><div className="tear-hole" /><span /><div className="tear-hole" />
            </div>

            <div className="section-label">Earn more</div>
            <ChallengeList />

            <div className="tear">
              <div className="tear-hole" /><span /><div className="tear-hole" /><span /><div className="tear-hole" />
            </div>

            <div className="section-label">Recent entries</div>
            <LedgerList entries={entries.slice(0, 3)} />
            {entries.length > 3 && (
              <Link
                to="/activity"
                style={{ fontSize: '12px', color: 'var(--brass)', textDecoration: 'underline' }}
              >
                View more
              </Link>
            )}
          </>
        )}
      </div>

      {modalOpen && (
        <RedeemModal
          balance={balance}
          onClose={() => setModalOpen(false)}
          onRequested={() => {
            setModalOpen(false)
            refreshRedemptions()
          }}
        />
      )}
    </div>
  )
}
