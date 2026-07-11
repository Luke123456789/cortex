export default function BalanceCard({ balance, pendingRequest, onRedeemClick }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1.5px solid var(--rule-strong)',
        borderRadius: 'var(--radius)',
        padding: '20px 18px',
        marginBottom: '18px',
      }}
    >
      <div className="section-label" style={{ marginBottom: '6px' }}>
        Time balance
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
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

        <div
          style={{
            width: '58px',
            height: '58px',
            border: '2px solid var(--brass)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-8deg)',
            flexShrink: 0,
          }}
        >
          <div
            className="mono"
            style={{ fontSize: '9px', color: 'var(--brass)', textAlign: 'center', lineHeight: 1.15, letterSpacing: '0.4px' }}
          >
            AVAILABLE<br />NOW
          </div>
        </div>
      </div>

      {pendingRequest ? (
        <div
          style={{
            marginTop: '14px',
            background: 'var(--brass-light)',
            color: 'var(--brass)',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '12.5px',
            fontWeight: 500,
          }}
        >
          Redeem requested — {pendingRequest.minutes_requested} min waiting on Dad
        </div>
      ) : (
        <button
          onClick={onRedeemClick}
          disabled={balance <= 0}
          style={{
            marginTop: '14px',
            width: '100%',
            background: balance > 0 ? 'var(--ink)' : 'var(--rule)',
            color: 'var(--paper)',
            border: 'none',
            borderRadius: '8px',
            padding: '11px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Redeem
        </button>
      )}
    </div>
  )
}
