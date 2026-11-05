import { useNavigate } from 'react-router-dom'
import styles from './ChallengeList.module.css'

// Rewards are written server-side by the grading edge functions; this list
// only navigates.
const CHALLENGES = [
  {
    id: 'written-test',
    name: 'Written test',
    desc: 'Exam-style questions set for you, marked against the scheme',
    type: 'navigate',
    to: '/assignments',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: 'tutor',
    name: 'Ask the tutor',
    desc: 'Chat it through, one to one',
    type: 'navigate',
    to: '/tutor',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
]

export default function ChallengeList() {
  const navigate = useNavigate()

  function handleClick(challenge) {
    if (challenge.type === 'navigate') {
      navigate(challenge.to)
    }
    // coming-soon: inert, no action
  }

  return (
    <ul className={styles.list}>
      {CHALLENGES.map((challenge) => {
        const isComingSoon = challenge.type === 'coming-soon'
        const content = (
          <>
            <span className={styles.main}>
              <span className={styles.icon} aria-hidden="true">{challenge.icon}</span>
              <span>
                <span className={styles.name}>{challenge.name}</span>
                <span className={styles.desc}>{challenge.desc}</span>
              </span>
            </span>
            {isComingSoon ? (
              <span className="tag">Coming soon</span>
            ) : challenge.type === 'navigate' ? (
              <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            ) : (
              <span className={styles.reward}>+{challenge.minutes} min</span>
            )}
          </>
        )
        return (
          <li key={challenge.id}>
            {isComingSoon ? (
              <div className={`${styles.item} ${styles.disabled}`} aria-disabled="true">{content}</div>
            ) : (
              <button type="button" className={styles.item} onClick={() => handleClick(challenge)}>{content}</button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
