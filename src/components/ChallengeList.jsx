import { supabase } from '../lib/supabaseClient'

// Placeholder reward amounts and icons. Once the real quiz / worked example /
// tutor screens exist, they'll write the ledger_entries row themselves with
// an actual result (score, topic) instead of this flat click-to-earn stub.
const CHALLENGES = [
  {
    id: 'quickfire',
    name: 'Quickfire quiz',
    desc: '10 questions, 5 min',
    minutes: 5,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
      </svg>
    ),
  },
  {
    id: 'example',
    name: 'Worked example',
    desc: 'Follow a full mark-scheme answer',
    minutes: 3,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: 'tutor',
    name: 'Ask the tutor',
    desc: 'Get a topic explained, then answer 3 checks',
    minutes: 8,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--brass)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" />
        <circle cx="12" cy="17" r="0.5" fill="var(--brass)" />
      </svg>
    ),
  },
]

export default function ChallengeList() {
  async function handleEarn(challenge) {
    const { error } = await supabase.from('ledger_entries').insert({
      type: 'earn',
      amount_minutes: challenge.minutes,
      source: challenge.name,
    })
    if (error) console.error('Failed to log earn', error)
    // useLedger's realtime subscription picks this up and updates the UI.
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {CHALLENGES.map((challenge) => (
        <div
          key={challenge.id}
          onClick={() => handleEarn(challenge)}
          style={{
            background: 'var(--card)',
            border: '1px solid var(--rule)',
            borderRadius: 'var(--radius)',
            padding: '14px 15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--brass-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {challenge.icon}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{challenge.name}</div>
              <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginTop: '1px' }}>{challenge.desc}</div>
            </div>
          </div>
          <div
            className="mono"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--green)',
              background: 'var(--green-bg)',
              padding: '4px 9px',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            +{challenge.minutes} min
          </div>
        </div>
      ))}
    </div>
  )
}
