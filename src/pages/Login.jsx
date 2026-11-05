import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import styles from './Login.module.css'

export default function Login() {
  const { user, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError('Wrong email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page--centered">
      <main className={styles.card}>
        <h1 className={`wordmark ${styles.wordmark}`}>CORTEX</h1>
        <p className={styles.subtitle}>Sign in</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <label className="field-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className={`field ${styles.input}`}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="field-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className={`field ${styles.input}`}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error-text" role="alert">{error}</p>}

          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </main>
    </div>
  )
}
