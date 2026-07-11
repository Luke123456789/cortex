import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function RedeemModal({ balance, onClose, onRequested }) {
  const [minutes, setMinutes] = useState(Math.min(15, balance))
  const [submitting, setSubmitting] = useState(false)

  async function handleConfirm() {
    setSubmitting(true)
    const { error } = await supabase.from('redemption_requests').insert({
      minutes_requested: minutes,
      status: 'pending',
    })
    setSubmitting(false)
    if (error) {
      console.error('Failed to submit redemption request', error)
      return
    }
    onRequested()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(30, 42, 56, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 10,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1.5px solid var(--rule-strong)',
          padding: '20px',
          width: '100%',
          maxWidth: '320px',
        }}
      >
        <div className="section-label">Redeem time</div>
        <p style={{ fontSize: '13px', color: 'var(--ink-soft)', marginBottom: '16px' }}>
          This sends a request to Dad. Your balance won't change until he confirms it.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <input
            type="range"
            min="1"
            max={Math.max(balance, 1)}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span className="mono" style={{ fontSize: '15px', fontWeight: 600, minWidth: '48px', textAlign: 'right' }}>
            {minutes} min
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid var(--rule-strong)',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--ink)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || minutes < 1}
            style={{
              flex: 1,
              background: 'var(--ink)',
              color: 'var(--paper)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {submitting ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </div>
    </div>
  )
}
