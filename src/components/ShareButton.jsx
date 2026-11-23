import { useState } from 'react'
import { shareToWhatsApp } from '../lib/share'

// "Share on WhatsApp" for a piece of the student's work. `getText` builds the
// message when tapped, so it always reflects what's on screen.
export default function ShareButton({ getText, label = 'Share on WhatsApp', className = 'btn btn--secondary btn--block' }) {
  const [busy, setBusy] = useState(false)
  async function onClick() {
    setBusy(true)
    try {
      await shareToWhatsApp(getText())
    } finally {
      setBusy(false)
    }
  }
  return (
    <button type="button" className={className} onClick={onClick} disabled={busy}>
      {label}
    </button>
  )
}
