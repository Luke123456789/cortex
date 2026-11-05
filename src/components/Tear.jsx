// The perforated "tear" divider between sections.
export default function Tear({ className = '' }) {
  return (
    <div className={`tear ${className}`.trim()} aria-hidden="true">
      <div className="tear-hole" /><span /><div className="tear-hole" /><span /><div className="tear-hole" />
    </div>
  )
}
