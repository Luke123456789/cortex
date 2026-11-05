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
import Tear from '../components/Tear.jsx'
import styles from './Home.module.css'
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
    <div className="page page--wide">
      {(isPractice || notifStatus === 'disabled') && (
        <div className={styles.banners}>
          {isPractice && (
            <div className={styles.practice}>
              <div className={styles.practiceTitle}>Practice mode</div>
              You're using the student view as a practice student. Nothing here touches the real student's data, and no screen time is earned.
              <div className={styles.practiceReset}>
                <button type="button" className="link" onClick={handleResetPractice} disabled={resetting}>
                  {resetting ? 'Resetting…' : 'Reset practice data'}
                </button>
              </div>
            </div>
          )}

          {notifStatus === 'disabled' && (
            <button type="button" className="btn btn--soft btn--block" onClick={handleEnableNotifications}>
              Enable notifications on this device
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p className="empty">Loading…</p>
      ) : (
        <div className={styles.dashboard}>
          <div className={styles.headline}>
            <ExamCountdown />
            <BalanceCard balance={balance} pendingRequest={pending} onRedeemClick={() => setModalOpen(true)} />
          </div>

          <Tear className={styles.tear} />

          <div className={styles.panels}>
            {pendingAssignments.length > 0 && (
              <section className={styles.panel} aria-labelledby="home-work">
                <h2 id="home-work" className="section-label">Assigned work</h2>
                <ul className={styles.work}>
                  {pendingAssignments.slice(0, 3).map((a) => {
                    const action = assignmentAction(a)
                    return (
                      <li key={a.id} className={`card ${styles.workItem}`}>
                        <div>
                          <div className={styles.workTitle}>{a.title}</div>
                          <span className="meta">{ASSIGNMENT_TYPE_LABELS[a.type] || a.type}</span>
                        </div>
                        {action ? (
                          <Link to={action.to} className="btn btn--primary btn--small">{action.label}</Link>
                        ) : (
                          <span className="tag">Soon</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
                {pendingAssignments.length > 3 && (
                  <Link to="/assignments" className={`link ${styles.more}`}>View more</Link>
                )}
              </section>
            )}

            <section className={styles.panel} aria-labelledby="home-earn">
              <h2 id="home-earn" className="section-label">Earn more</h2>
              <ChallengeList />
            </section>
          </div>

          <Tear className={`${styles.tear} ${styles.recentTear}`} />

          <section className={styles.panel} aria-labelledby="home-recent">
            <h2 id="home-recent" className="section-label">Recent entries</h2>
            <LedgerList entries={entries.slice(0, 3)} />
            {entries.length > 3 && (
              <Link to="/activity" className={`link ${styles.more}`}>View more</Link>
            )}
          </section>
        </div>
      )}

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
