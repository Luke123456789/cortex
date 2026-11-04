import { Link } from 'react-router-dom'
import TutorSessionHistory from '../components/TutorSessionHistory.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

export default function TutorSessions() {
  const { childStudent } = useAuth()
  return (
    <div className="device">
      <div className="screen">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div className="wordmark">CORTEX</div>
          <Link to="/parent" style={{ fontSize: '11px', color: 'var(--ink-faint)', textDecoration: 'underline' }}>
            Back
          </Link>
        </div>

        <TutorSessionHistory studentId={childStudent?.id} />
      </div>
    </div>
  )
}
