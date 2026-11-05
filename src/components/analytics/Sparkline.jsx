// Weekly accuracy for one subject, oldest week first; null = no quizzes that
// week (a gap in the line). Decorative: the row's text carries the numbers.
const W = 120
const H = 32
const PAD = 4

export default function Sparkline({ values }) {
  const points = values.map((v, i) => (v == null ? null : { i, v }))
  const known = points.filter(Boolean)
  if (known.length === 0) return <span className="meta">No quizzes</span>

  const lo = Math.min(50, ...known.map((p) => p.v - 5))
  const x = (i) => PAD + (i / (values.length - 1)) * (W - PAD * 2)
  const y = (v) => PAD + (1 - (v - lo) / (100 - lo)) * (H - PAD * 2)

  // Break the line where a week has no data.
  const segments = []
  let run = []
  for (const p of points) {
    if (p) run.push(p)
    else if (run.length) { segments.push(run); run = [] }
  }
  if (run.length) segments.push(run)

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="sparkline">
      <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="var(--rule)" strokeWidth="1" />
      {segments.filter((s) => s.length > 1).map((s, k) => (
        <polyline key={k} points={s.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')} fill="none" stroke="var(--brass)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {known.map((p) => (
        <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={p === known[known.length - 1] ? 4 : 2.5} fill="var(--brass)" stroke="var(--card)" strokeWidth="2" />
      ))}
    </svg>
  )
}
