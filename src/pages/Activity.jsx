import { useLedger } from '../hooks/useLedger'
import { useAuth } from '../hooks/useAuth.jsx'
import LedgerList from '../components/LedgerList.jsx'

export default function Activity() {
  // Linked from the student view (Home), so it shows the student-view ledger:
  // the student's own, or the practice student's for a parent.
  const { studentId } = useAuth()
  const { entries, loading } = useLedger(studentId)

  return (
    <div className="device">
      <div className="screen">

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
