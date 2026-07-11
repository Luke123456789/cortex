import { useState } from 'react'
import { useLedger } from '../hooks/useLedger'
import { useRedemptions } from '../hooks/useRedemptions'
import BalanceCard from '../components/BalanceCard.jsx'
import LedgerList from '../components/LedgerList.jsx'
import ChallengeList from '../components/ChallengeList.jsx'
import RedeemModal from '../components/RedeemModal.jsx'

export default function Home() {
  const { entries, balance, loading } = useLedger()
  const { pending, refresh: refreshRedemptions } = useRedemptions()
  const [modalOpen, setModalOpen] = useState(false)

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
        </div>

        {loading ? (
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>Loading…</div>
        ) : (
          <>
            <BalanceCard balance={balance} pendingRequest={pending} onRedeemClick={() => setModalOpen(true)} />

            <div className="tear">
              <div className="tear-hole" /><span /><div className="tear-hole" /><span /><div className="tear-hole" />
            </div>

            <div className="section-label">Recent entries</div>
            <LedgerList entries={entries} />

            <div className="tear">
              <div className="tear-hole" /><span /><div className="tear-hole" /><span /><div className="tear-hole" />
            </div>

            <div className="section-label">Earn more</div>
            <ChallengeList />
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
