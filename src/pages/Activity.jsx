import { Link } from 'react-router-dom'
import { useLedger } from '../hooks/useLedger'
import { useAuth } from '../hooks/useAuth.jsx'
import LedgerList from '../components/LedgerList.jsx'

export default function Activity() {
  const { entries, loading } = useLedger()
  const { profile } = useAuth()
  const backTarget = profile?.role === 'parent' ? '/parent' : '/'

  return (
    <div className="device">
      <div className="screen">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div className="wordmark">CORTEX</div>
          <Link to={backTarget} style={{ fontSize: '11px', color: 'var(--ink-faint)', textDecoration: 'underline' }}>
            Back
          </Link>
        </div>

        <div className="section-label">Activity</div>

        {loading ? (
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>Loading…</div>
        ) : (
          <LedgerList entries={entries} />
        )}
      </div>
    </div>
  )
}
