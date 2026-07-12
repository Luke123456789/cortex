import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export default function RoleSwitch({ view }) {
  const { profile } = useAuth()

  if (profile?.role !== 'parent') return null

  const target = view === 'parent' ? '/' : '/parent'
  const label = view === 'parent' ? 'Student view' : 'Parent view'

  return (
    <Link
      to={target}
      style={{
        fontSize: '10.5px',
        color: 'var(--ink-faint)',
        textDecoration: 'none',
        border: '1px solid var(--rule)',
        borderRadius: '20px',
        padding: '4px 10px',
        fontFamily: "'IBM Plex Mono', monospace",
        letterSpacing: '0.3px',
      }}
    >
      {label} ↗
    </Link>
  )
}
