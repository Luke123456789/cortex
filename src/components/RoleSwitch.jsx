import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import styles from './RoleSwitch.module.css'

// Parent-only mode selector: Student view (the practice student, see useAuth)
// or Parent view. Same destinations as before, shown as a two-way switch.
export default function RoleSwitch({ view }) {
  const { profile } = useAuth()

  if (profile?.role !== 'parent') return null

  return (
    <nav className={styles.switch} aria-label="Mode">
      <Link to="/" className={styles.option} aria-current={view === 'student' ? 'page' : undefined}>
        Student
      </Link>
      <Link to="/parent" className={styles.option} aria-current={view === 'parent' ? 'page' : undefined}>
        Parent
      </Link>
    </nav>
  )
}
