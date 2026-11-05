import { Link } from 'react-router-dom'
import styles from './QuizSelect.module.css'

// The old free-browse quiz picker (this screen -> the original Play.jsx) was
// removed in the Phase 1 reward-mechanism redesign — letting a student pick
// and grind any quiz on demand was the app's main speed-farming exploit.
// Quizzes are back (see /play/:quizId), but parent-assigned only — there is
// no self-serve catalog anymore. This stub exists so the /quizzes route
// (still reachable via a bookmark or the browser back button) doesn't
// dead-end into a blank page.
export default function QuizSelect() {
  return (
    <div className="page">
      <h1 className="section-label">Start a quiz</h1>

      <p className={`card ${styles.note}`}>
        Quizzes are assigned by a parent now, not picked freely. Check <Link to="/assignments">Assigned work</Link> on your home screen, or head to <Link to="/tutor">Ask the tutor</Link> to earn screen time in the meantime.
      </p>
    </div>
  )
}
