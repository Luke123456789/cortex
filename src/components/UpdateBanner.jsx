import { useEffect, useState } from 'react'

// The app is a single page, so a phone that keeps it open never picks up a
// new deploy. Every few minutes (and whenever the app comes back to the
// foreground) compare the live index.html's script bundle with the one this
// page loaded; if it changed, offer a reload.
const CHECK_MS = 5 * 60 * 1000

function currentBundle() {
  const el = document.querySelector('script[type="module"][src*="/assets/"]')
  return el ? new URL(el.getAttribute('src'), location.origin).pathname : null
}

export default function UpdateBanner() {
  const [stale, setStale] = useState(false)

  useEffect(() => {
    const mine = currentBundle()
    if (!mine) return undefined // dev server: nothing to compare
    let stopped = false
    async function check() {
      if (stopped || document.visibilityState !== 'visible') return
      try {
        const html = await (await fetch('/', { cache: 'no-store' })).text()
        const live = html.match(/src="([^"]*\/assets\/[^"]+\.js)"/)?.[1]
        if (live && new URL(live, location.origin).pathname !== mine) setStale(true)
      } catch {
        // Offline: try again later.
      }
    }
    const timer = setInterval(check, CHECK_MS)
    document.addEventListener('visibilitychange', check)
    check()
    return () => {
      stopped = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  if (!stale) return null
  return (
    <div role="status" style={{
      position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(var(--tabbar-h, 60px) + 12px)',
      zIndex: 1000, display: 'flex', gap: 'var(--space-3, 12px)', alignItems: 'center',
      background: 'var(--ink)', color: 'var(--card)', padding: '10px 14px', borderRadius: 'var(--radius, 10px)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)', maxWidth: 'calc(100vw - 24px)',
    }}>
      <span>A new version of Cortex is ready.</span>
      <button type="button" className="btn btn--small btn--soft" onClick={() => location.reload()}>Update</button>
    </div>
  )
}
