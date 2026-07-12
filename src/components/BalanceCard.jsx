export default function BalanceCard({ balance, pendingRequest, onRedeemClick }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1.5px solid var(--rule-strong)',
        borderRadius: 'var(--radius)',
        padding: '18px',
        marginBottom: '18px',
      }}
    >
      <div className="section-label" style={{ marginBottom: '6px' }}>
        Screen time earned
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <span
            className="mono"
            style={{ fontSize: '46px', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
          >
            {balance}
          </span>
          <span style={{ fontSize: '15px', color: 'var(--ink-soft)', marginLeft: '6px', fontWeight: 500 }}>
            min
          </span>
        </div>

        {pendingRequest ? (
          <div
            className="mono"
            style={{
              background: 'var(--brass-light)',
              color: 'var(--brass)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '11.5px',
              fontWeight: 600,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {pendingRequest.minutes_requested} min<br />pending
          </div>
        ) : (
          <button
            onClick={onRedeemClick}
            disabled={balance <= 0}
            style={{
              flexShrink: 0,
              background: balance > 0 ? 'var(--ink)' : 'var(--rule)',
              color: 'var(--paper)',
              border: 'none',
              borderRadius: '8px',
              padding: '11px 20px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Redeem
          </button>
        )}
      </div>
    </div>
  )
}
