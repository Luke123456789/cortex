import { Link } from 'react-router-dom'
import { useRedemptions } from '../hooks/useRedemptions'

function formatTime(isoString) {
  return new Date(isoString).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function RedemptionHistory() {
  const { requests, loading } = useRedemptions()
  const resolvedRequests = requests.filter((r) => r.status !== 'pending')

  return (
    <div className="device">
      <div className="screen">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div className="wordmark">CORTEX</div>
          <Link to="/parent" style={{ fontSize: '11px', color: 'var(--ink-faint)', textDecoration: 'underline' }}>
            Back
          </Link>
        </div>

        <div className="section-label">Redemption requests</div>

        {loading ? (
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>Loading…</div>
        ) : resolvedRequests.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>No requests yet.</div>
        ) : (
          resolvedRequests.map((request) => (
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
          ))
        )}
      </div>
    </div>
  )
}
