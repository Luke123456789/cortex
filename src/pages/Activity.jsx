import { useLedger } from '../hooks/useLedger'
import { useAuth } from '../hooks/useAuth.jsx'
import LedgerList from '../components/LedgerList.jsx'

export default function Activity() {
  // Linked from the student view (Home), so it shows the student-view ledger:
  // the student's own, or the practice student's for a parent.
  const { studentId } = useAuth()
  const { entries, loading } = useLedger(studentId)

  return (
    <div className="page page--wide">
      <h1 className="section-label">Activity</h1>

      {loading ? (
        <p className="empty">Loading…</p>
      ) : (
        <LedgerList entries={entries} layout="table" />
      )}
    </div>
  )
}
