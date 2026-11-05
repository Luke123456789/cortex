import { useRedemptions } from '../hooks/useRedemptions'
import { useAuth } from '../hooks/useAuth.jsx'
import styles from './RedemptionHistory.module.css'

function formatTime(isoString) {
  return new Date(isoString).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function RedemptionHistory() {
  const { childStudent } = useAuth()
  const { requests, loading } = useRedemptions(childStudent?.id)
  const resolvedRequests = requests.filter((r) => r.status !== 'pending')

  return (
    <div className="page">
      <h1 className="section-label">Redemption requests</h1>

      {loading ? (
        <p className="empty">Loading…</p>
      ) : resolvedRequests.length === 0 ? (
        <p className="empty">No requests yet.</p>
      ) : (
        <div className={styles.scroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Requested</th>
                <th scope="col">When</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {resolvedRequests.map((request) => (
                <tr key={request.id}>
                  <td className={styles.minutes}>{request.minutes_requested} min requested</td>
                  <td className={`meta ${styles.when}`}>{formatTime(request.requested_at)}</td>
                  <td className={`${styles.status} ${request.status === 'approved' ? styles.approved : styles.denied}`}>
                    {request.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
