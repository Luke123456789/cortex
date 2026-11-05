import styles from './BalanceCard.module.css'

export default function BalanceCard({ balance, pendingRequest, onRedeemClick, className = '' }) {
  return (
    <div className={`card card--strong ${styles.root} ${className}`}>
      <div className={`section-label ${styles.label}`}>Screen time earned</div>

      <div className={styles.row}>
        <div>
          <span className={styles.amount}>{balance}</span>
          <span className={styles.unit}>min</span>
        </div>

        {pendingRequest ? (
          <div className={styles.pending}>
            {pendingRequest.minutes_requested} min<br />pending
          </div>
        ) : (
          <button
            type="button"
            className={`btn btn--primary ${styles.redeem}`}
            onClick={onRedeemClick}
            disabled={balance <= 0}
          >
            Redeem
          </button>
        )}
      </div>
    </div>
  )
}
