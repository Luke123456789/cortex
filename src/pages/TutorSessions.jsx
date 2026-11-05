import TutorSessionHistory from '../components/TutorSessionHistory.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

export default function TutorSessions() {
  const { childStudent } = useAuth()
  return (
    <div className="device">
      <div className="screen">

        <TutorSessionHistory studentId={childStudent?.id} />
      </div>
    </div>
  )
}
