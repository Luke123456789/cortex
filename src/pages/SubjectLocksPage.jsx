import { useAuth } from '../hooks/useAuth.jsx'
import SubjectLocks from '../components/SubjectLocks.jsx'

// Its own nav destination in the parent shell; the same component as on the
// parent overview.
export default function SubjectLocksPage() {
  const { childStudent } = useAuth()
  return (
    <div className="page">
      <SubjectLocks studentId={childStudent?.id} headingLevel={1} />
    </div>
  )
}
