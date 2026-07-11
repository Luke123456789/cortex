import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export default function ProtectedRoute({ children, requireRole }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="device">
        <div className="screen" style={{ fontSize: '13px', color: 'var(--ink-faint)' }}>
          Loading…
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (requireRole && profile?.role !== requireRole) return <Navigate to="/" replace />

  return children
}
