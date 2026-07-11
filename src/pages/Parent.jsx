import { useRedemptions } from '../hooks/useRedemptions'
import { supabase } from '../lib/supabaseClient'

function formatTime(isoString) {
  return new Date(isoString).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function Parent() {
  const { requests, refresh } = useRedemptions()

  async function approve(request) {
    const { error: insertError } = await supabase.from('ledger_entries').insert({
      type: 'spend',
      amount_minutes: request.minutes_requested,
      source: 'Redemption approved',
    })
    if (insertError) {
      console.error('Failed to log spend', insertError)
      return
    }

    const { error: updateError } = await supabase
      .from('redemption_requests')
      .update({ status: 'approved', resolved_at: new Date().toISOString() })
      .eq('id', request.id)

    if (updateError) console.error('Failed to update request', updateError)
    refresh()
  }

  async function deny(request) {
    const { error } = await supabase
      .from('redemption_requests')
      .update({ status: 'denied', resolved_at: new Date().toISOString() })
      .eq('id', request.id)
    if (error) console.error('Failed to update request', error)
    refresh()
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending')
  const resolvedRequests = requests.filter((r) => r.status !== 'pending')

  return (
    <div className="device">
      <div className="screen">
        <div className="wordmark" style={{ marginBottom: '4px' }}>CORTEX</div>
        <div className="mono" style={{ fontSize: '10px', letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: '22px' }}>
          Parent approvals
        </div>

        <div className="section-label">Pending</div>
        {pendingRequests.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--ink-faint)', marginBottom: '20px' }}>Nothing waiting on you.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius)',
                  padding: '14px 15px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span className="mono" style={{ fontSize: '15px', fontWeight: 600 }}>{request.minutes_requested} min</span>
                  <span className="mono" style={{ fontSize: '10.5px', color: 'var(--ink-faint)' }}>{formatTime(request.requested_at)}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => deny(request)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: '1px solid var(--rule-strong)',
                      borderRadius: '8px',
                      padding: '9px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--red)',
                    }}
                  >
                    Deny
                  </button>
                  <button
                    onClick={() => approve(request)}
                    style={{
                      flex: 1,
                      background: 'var(--ink)',
                      color: 'var(--paper)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '9px',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="section-label">Recent</div>
        {resolvedRequests.slice(0, 8).map((request) => (
          <div
            key={request.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid var(--rule)',
            }}
          >
            <div>
              <div style={{ fontSize: '13.5px' }}>{request.minutes_requested} min requested</div>
              <span className="mono" style={{ fontSize: '9.5px', color: 'var(--ink-faint)' }}>{formatTime(request.requested_at)}</span>
            </div>
            <span
              className="mono"
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: request.status === 'approved' ? 'var(--green)' : 'var(--red)',
              }}
            >
              {request.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
