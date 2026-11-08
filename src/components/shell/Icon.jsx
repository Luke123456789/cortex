// Small inline icon set (stroke icons, 24x24 grid). Decorative by default:
// the surrounding link or button carries the accessible name.
const PATHS = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></>,
  quiz: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="m8 9 1.5 1.5L12 8" /><path d="M14 9.5h2.5" /><path d="m8 15 1.5 1.5L12 14" /><path d="M14 15.5h2.5" /></>,
  tutor: <><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z" /><path d="M9.8 9.5a2.3 2.3 0 0 1 4.4.8c0 1.5-2.2 1.9-2.2 3.2" /><path d="M12 16.4h.01" /></>,
  assignments: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M9 10h6M9 14h6M9 18h3" /></>,
  activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
  overview: <><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></>,
  assign: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 8v8M8 12h8" /></>,
  history: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 1 1 2-2" /><path d="m3.5 12 1 1 2-2" /><path d="M4 18h2" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  redemptions: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  transcripts: <><path d="M4 5h16v11H9l-5 4Z" /><path d="M8 9h8M8 12.5h5" /></>,
  assessment: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  signout: <><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4" /><path d="M6 12h10" /></>,
  sidebar: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>,
}

export default function Icon({ name, size = 20, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
