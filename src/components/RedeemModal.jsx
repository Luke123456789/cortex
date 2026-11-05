import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Modal from './Modal.jsx'
import styles from './RedeemModal.module.css'

export default function RedeemModal({ studentId, balance, onClose, onRequested }) {
  const [minutes, setMinutes] = useState(Math.min(15, balance))
  const [submitting, setSubmitting] = useState(false)

  async function handleConfirm() {
    setSubmitting(true)
    const { error } = await supabase.from('redemption_requests').insert({
      student_id: studentId,
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
    <Modal labelledBy="redeem-title" onClose={onClose}>
      <h2 id="redeem-title" className="section-label">Redeem time</h2>
      <p className={styles.intro}>
        This sends a request to Dad. Your balance won't change until he confirms it.
      </p>

      <div className={styles.slider}>
        <label htmlFor="redeem-minutes" className="visually-hidden">Minutes to redeem</label>
        <input
          id="redeem-minutes"
          type="range"
          min="1"
          max={Math.max(balance, 1)}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
        />
        <output htmlFor="redeem-minutes" className={styles.value}>{minutes} min</output>
      </div>

      <div className={styles.actions}>
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn--primary" onClick={handleConfirm} disabled={submitting || minutes < 1}>
          {submitting ? 'Sending…' : 'Send request'}
        </button>
      </div>
    </Modal>
  )
}
