import { Link } from 'react-router-dom'

// The old free-browse quiz picker (this screen -> the original Play.jsx) was
// removed in the Phase 1 reward-mechanism redesign — letting a student pick
// and grind any quiz on demand was the app's main speed-farming exploit.
// Quizzes are back (see /play/:quizId), but parent-assigned only — there is
// no self-serve catalog anymore. This stub exists so the /quizzes route
// (still reachable via a bookmark or the browser back button) doesn't
// dead-end into a blank page.
export default function QuizSelect() {
  return (
    <div className="device">
      <div className="screen">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div className="wordmark">CORTEX</div>
          <Link to="/" style={{ fontSize: '11px', color: 'var(--ink-faint)', textDecoration: 'underline' }}>
            Back
          </Link>
        </div>

        <div className="section-label">Start a quiz</div>

        <div style={{ fontSize: '12.5px', color: 'var(--ink-faint)', background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', padding: '14px 15px' }}>
          Quizzes are assigned by a parent now, not picked freely. Check <Link to="/assignments" style={{ color: 'var(--ink)' }}>Assigned work</Link> on your home screen, or head to <Link to="/tutor" style={{ color: 'var(--ink)' }}>Ask the tutor</Link> to earn screen time in the meantime.
        </div>
      </div>
    </div>
  )
}
