import { Link } from 'react-router-dom'

// The reward-bearing MCQ quiz flow (this screen -> Play.jsx) was removed in
// the Phase 1 reward-mechanism redesign — it was the app's main speed-farming
// exploit. Quiz content comes back in Phase 2 as unannounced retention pop
// quizzes, not as a screen a student navigates to on demand. This stub exists
// so the /quizzes route (still reachable via a bookmark or the browser back
// button) doesn't dead-end into a blank page in the meantime.
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
          Quizzes are being redesigned as short retention checks rather than something you grind for minutes. Head to <Link to="/tutor" style={{ color: 'var(--ink)' }}>Ask the tutor</Link> to earn screen time for now.
        </div>
      </div>
    </div>
  )
}
