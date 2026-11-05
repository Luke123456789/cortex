import styles from './LedgerList.module.css'

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function Amount({ entry }) {
  return (
    <span className={styles.amount}>
      {entry.type === 'earn' ? '+' : '−'}{entry.amount_minutes} min
    </span>
  )
}

// layout="list": compact rows (Home). layout="table": a real table from
// tablet width up, stacked rows on a phone (Activity).
export default function LedgerList({ entries, layout = 'list' }) {
  if (entries.length === 0) {
    return <p className="empty">No entries yet — complete a challenge to start earning.</p>
  }

  if (layout === 'table') {
    return (
      <div className={styles.scroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Entry</th>
              <th scope="col">Note</th>
              <th scope="col">Time</th>
              <th scope="col" className={styles.num}>Minutes</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className={entry.type === 'earn' ? styles.earn : undefined}>
                <td className={styles.cellSource}>
                  <span className={styles.dot} aria-hidden="true" />
                  <span className={styles.source}>{entry.source}</span>
                </td>
                <td className={`meta ${styles.cellNote}`}>{entry.note || ''}</td>
                <td className={`meta ${styles.cellTime}`}>{formatTime(entry.created_at)}</td>
                <td className={styles.cellAmount}><Amount entry={entry} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <ul className={styles.list}>
      {entries.map((entry) => (
        <li key={entry.id} className={`${styles.row} ${entry.type === 'earn' ? styles.earn : ''}`}>
          <div className={styles.entry}>
            <span className={styles.dot} aria-hidden="true" />
            <div>
              <div className={styles.source}>{entry.source}</div>
              <span className={`meta ${styles.when}`}>
                {formatTime(entry.created_at)}
                {entry.note ? ` · ${entry.note}` : ''}
              </span>
            </div>
          </div>
          <Amount entry={entry} />
        </li>
      ))}
    </ul>
  )
}
