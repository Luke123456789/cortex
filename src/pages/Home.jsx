import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
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
import { getExistingSubscription, subscribeToPush, ensureSubscriptionSaved, pushSupported } from '../lib/push.js'

export default function Home() {
  // A student sees their own data; a parent's student view is their practice
  // student, so nothing done here touches the real student's data.
  const { studentId, isPractice } = useAuth()
  const { entries, balance, loading, refresh: refreshLedger } = useLedger(studentId)
  const { pending, refresh: refreshRedemptions } = useRedemptions(studentId)
  const { assignments, refresh: refreshAssignments } = useAssignments(studentId)
  const pendingAssignments = assignments.filter((a) => a.status === 'pending')
  const [modalOpen, setModalOpen] = useState(false)
  const [notifStatus, setNotifStatus] = useState('checking')
  const [resetting, setResetting] = useState(false)

  async function handleResetPractice() {
    if (!window.confirm('Delete everything the practice student has done (sessions, quizzes, minutes, requests)?')) return
    setResetting(true)
    const { error } = await supabase.rpc('reset_practice_data', { p_student: studentId })
    setResetting(false)
    if (error) {
      console.error('Failed to reset practice data', error)
      window.alert('Could not reset practice data. Try again.')
      return
    }
    await Promise.all([refreshLedger(), refreshRedemptions(), refreshAssignments()])
  }

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
        {isPractice && (
          <div style={{ background: 'var(--brass-light)', border: '1px solid var(--brass)', borderRadius: '8px', padding: '10px 12px', marginBottom: '18px', fontSize: '12px', color: 'var(--ink-soft)' }}>
            <div style={{ fontWeight: 600, color: 'var(--brass)', marginBottom: '4px' }}>Practice mode</div>
            You're using the student view as a practice student. Nothing here touches the real student's data, and no screen time is earned.
            <div style={{ marginTop: '8px' }}>
              <button
                onClick={handleResetPractice}
                disabled={resetting}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: '11.5px', color: 'var(--brass)', textDecoration: 'underline' }}
              >
                {resetting ? 'Resetting…' : 'Reset practice data'}
              </button>
            </div>
          </div>
        )}

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
          studentId={studentId}
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
