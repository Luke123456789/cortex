function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function LedgerList({ entries }) {
  if (entries.length === 0) {
    return (
      <div style={{ fontSize: '13px', color: 'var(--ink-faint)', paddingBottom: '4px' }}>
        No entries yet — complete a challenge to start earning.
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '8px' }}>
      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: entry.type === 'earn' ? 'var(--green)' : 'var(--red)',
              }}
            />
            <div>
              <div style={{ fontSize: '13.5px' }}>{entry.source}</div>
              <span className="mono" style={{ fontSize: '9.5px', color: 'var(--ink-faint)', display: 'block', marginTop: '1px' }}>
                {formatTime(entry.created_at)}
                {entry.note ? ` · ${entry.note}` : ''}
              </span>
            </div>
          </div>
          <div
            className="mono"
            style={{ fontSize: '14px', fontWeight: 600, color: entry.type === 'earn' ? 'var(--green)' : 'var(--red)' }}
          >
            {entry.type === 'earn' ? '+' : '−'}{entry.amount_minutes} min
          </div>
        </div>
      ))}
    </div>
  )
}
