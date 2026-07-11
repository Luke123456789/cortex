import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

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
    <div className="device">
      <div className="screen">
        <div className="wordmark" style={{ marginBottom: '4px' }}>CORTEX</div>
        <div className="mono" style={{ fontSize: '10px', letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: '26px' }}>
          Sign in
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '6px' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--rule-strong)',
              background: 'var(--card)',
              fontSize: '14px',
              marginBottom: '16px',
              fontFamily: 'Space Grotesk, sans-serif',
            }}
          />

          <label style={{ display: 'block', fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '6px' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--rule-strong)',
              background: 'var(--card)',
              fontSize: '14px',
              marginBottom: '20px',
              fontFamily: 'Space Grotesk, sans-serif',
            }}
          />

          {error && (
            <div style={{ fontSize: '12.5px', color: 'var(--red)', marginBottom: '14px' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              background: 'var(--ink)',
              color: 'var(--paper)',
              border: 'none',
              borderRadius: '8px',
              padding: '11px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
