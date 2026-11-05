import { useLayoutEffect, useRef, useState } from 'react'
import { niceScale } from '../../lib/analytics.js'
import styles from './ComparisonChart.module.css'

const HEIGHT = 180
const MARGIN = { top: 8, right: 4, bottom: 26, left: 34 }
const BAR_MAX = 24
const GAP = 2

const fmtDay = (d) => d.toLocaleDateString([], { weekday: 'short' })
const fmtDate = (d) => d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })

// Column with a 4px rounded top, square at the baseline.
function columnPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

function useWidth(ref) {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [ref])
  return width
}

// Last 7 days against the 7 before, one day per group. Two series: the
// current week in the accent, the previous week in the de-emphasis gray.
export default function ComparisonChart({ id, title, unit, days, current, previous }) {
  const plotRef = useRef(null)
  const width = useWidth(plotRef)
  const [active, setActive] = useState(null)

  const totalCurrent = current.reduce((a, b) => a + b, 0)
  const totalPrevious = previous.reduce((a, b) => a + b, 0)
  const { max, step } = niceScale(Math.max(...current, ...previous))
  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right)
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom
  const groupW = innerW / 7
  const barW = Math.max(4, Math.min(BAR_MAX, (groupW - 12 - GAP) / 2))
  const y = (v) => MARGIN.top + innerH - (v / max) * innerH
  const ticks = []
  for (let v = 0; v <= max; v += step) ticks.push(v)

  const describe = (i) => `${fmtDate(days.current[i])}: ${current[i]} ${unit}. ${fmtDate(days.previous[i])}: ${previous[i]} ${unit}.`

  return (
    <figure className={styles.chart} aria-labelledby={`${id}-title`}>
      <div className={styles.head}>
        <figcaption id={`${id}-title`} className={styles.title}>{title}</figcaption>
        <ul className={styles.legend}>
          <li><span className={`${styles.key} ${styles.keyCurrent}`} aria-hidden="true" />Last 7 days <strong>{totalCurrent}</strong></li>
          <li><span className={`${styles.key} ${styles.keyPrevious}`} aria-hidden="true" />Previous 7 days <strong>{totalPrevious}</strong></li>
        </ul>
      </div>

      <div ref={plotRef} className={styles.plot} onMouseLeave={() => setActive(null)}>
        {width > 0 && (
          <svg className={styles.svg} width={width} height={HEIGHT} role="group" aria-label={`${title}, by day`}>
            {ticks.map((t) => (
              <g key={t}>
                <line className={styles.grid} x1={MARGIN.left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} />
                <text className={styles.axisText} x={MARGIN.left - 6} y={y(t)} dy="0.32em" textAnchor="end">{t}</text>
              </g>
            ))}
            {current.map((_, i) => {
              const gx = MARGIN.left + i * groupW
              const cx = gx + groupW / 2
              const prevX = cx - GAP / 2 - barW
              const curX = cx + GAP / 2
              const hPrev = innerH - (y(previous[i]) - MARGIN.top)
              const hCur = innerH - (y(current[i]) - MARGIN.top)
              return (
                <g key={i}>
                  <rect
                    className={`${styles.hit} ${active === i ? styles.hitActive : ''}`}
                    x={gx + 1}
                    y={MARGIN.top}
                    width={groupW - 2}
                    height={innerH}
                    rx={4}
                    tabIndex={0}
                    role="img"
                    aria-label={describe(i)}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                  />
                  {previous[i] > 0 && <path className={styles.previous} d={columnPath(prevX, y(previous[i]), barW, hPrev)} pointerEvents="none" />}
                  {current[i] > 0 && <path className={styles.current} d={columnPath(curX, y(current[i]), barW, hCur)} pointerEvents="none" />}
                  <text className={styles.axisText} x={cx} y={HEIGHT - 8} textAnchor="middle">{fmtDay(days.current[i])}</text>
                </g>
              )
            })}
          </svg>
        )}

        {totalCurrent === 0 && totalPrevious === 0 && width > 0 && (
          <p className={styles.emptyNote}>None in either week</p>
        )}

        {active != null && width > 0 && (
          <div className={styles.tooltip} style={{ left: `${Math.min(Math.max(MARGIN.left + (active + 0.5) * groupW, 80), width - 80)}px` }} aria-hidden="true">
            <div className={styles.tooltipRow}>
              <span className={`${styles.line} ${styles.keyCurrent}`} />
              <strong>{current[active]}</strong> {fmtDate(days.current[active])}
            </div>
            <div className={styles.tooltipRow}>
              <span className={`${styles.line} ${styles.keyPrevious}`} />
              <strong>{previous[active]}</strong> {fmtDate(days.previous[active])}
            </div>
          </div>
        )}
      </div>

      <details className={styles.tableToggle}>
        <summary>Show as table</summary>
        <table className={styles.table}>
          <caption className="visually-hidden">{title}</caption>
          <thead>
            <tr><th scope="col">Day</th><th scope="col">Last 7 days</th><th scope="col">Previous 7 days</th></tr>
          </thead>
          <tbody>
            {current.map((v, i) => (
              <tr key={i}>
                <td>{fmtDay(days.current[i])}</td>
                <td>{v}</td>
                <td>{previous[i]}</td>
              </tr>
            ))}
            <tr><td>Total</td><td>{totalCurrent}</td><td>{totalPrevious}</td></tr>
          </tbody>
        </table>
      </details>
    </figure>
  )
}
