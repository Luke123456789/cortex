import { useState, useEffect } from 'react'
import { useLedger } from '../hooks/useLedger'
import { useRedemptions } from '../hooks/useRedemptions'
import { useAuth } from '../hooks/useAuth.jsx'
import BalanceCard from '../components/BalanceCard.jsx'
import LedgerList from '../components/LedgerList.jsx'
import ChallengeList from '../components/ChallengeList.jsx'
import RedeemModal from '../components/RedeemModal.jsx'
import RoleSwitch from '../components/RoleSwitch.jsx'
import { getExistingSubscription, subscribeToPush, ensureSubscriptionSaved, pushSupported } from '../lib/push.js'

export default function Home() {
  const { entries, balance, loading } = useLedger()
  const { pending, refresh: refreshRedemptions } = useRedemptions()
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
              GCSE Economics · Paper 2
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
            <BalanceCard balance={balance} pendingRequest={pending} onRedeemClick={() => setModalOpen(true)} />

            <div className="tear">
              <div className="tear-hole" /><span /><div className="tear-hole" /><span /><div className="tear-hole" />
            </div>

            <div className="section-label">Earn more</div>
            <ChallengeList />

            <div className="tear">
              <div className="tear-hole" /><span /><div className="tear-hole" /><span /><div className="tear-hole" />
            </div>

            <div className="section-label">Recent entries</div>
            <LedgerList entries={entries} />
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
