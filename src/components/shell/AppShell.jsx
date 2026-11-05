import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useBalance } from '../../hooks/useLedger'
import RoleSwitch from '../RoleSwitch.jsx'
import Icon from './Icon.jsx'
import { WallpaperContext } from './Wallpaper.jsx'
import { wallpaperFor } from '../../lib/wallpapers'
import { PARENT_NAV, STUDENT_NAV, isActive, isParentPath } from './navConfig'
import styles from './AppShell.module.css'

function NavLinks({ items, pathname, className, linkClassName, labelKey = 'label' }) {
  return (
    <ul className={className}>
      {items.map((item) => {
        const active = isActive(item, pathname)
        return (
          <li key={item.to}>
            <Link
              to={item.to}
              className={linkClassName}
              aria-current={active ? 'page' : undefined}
              title={item.label}
            >
              <Icon name={item.icon} />
              <span className={styles.navLabel}>{item[labelKey]}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function Balance({ value, label, compact }) {
  return (
    <div className={compact ? styles.balancePill : styles.balanceCard}>
      <span className={compact ? 'visually-hidden' : styles.balanceLabel}>{label}</span>
      <span className="visually-hidden">: </span>
      <span className={styles.balanceValue}>
        {value ?? '…'}
        <span className={styles.balanceUnit}> min</span>
      </span>
    </div>
  )
}

// The app frame: sticky header + bottom tab bar on a phone, a left sidebar
// (icon-only by default on a tablet) on wider screens. Pages render in <main>.
export default function AppShell() {
  const { pathname } = useLocation()
  const { profile, signOut, studentId, isPractice, childStudent } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Subject wallpaper set by the page being shown (see useSubjectWallpaper).
  const [wallpaperSubject, setWallpaperSubject] = useState(null)
  const wallpaper = wallpaperFor(wallpaperSubject)

  const isParent = profile?.role === 'parent'
  const parentMode = isParent && isParentPath(pathname)
  const items = parentMode ? PARENT_NAV : STUDENT_NAV

  // Student mode: the student view's own balance (the practice student's for
  // a parent). Parent mode: the real student being looked after.
  const balanceStudentId = parentMode ? childStudent?.id : studentId
  const { balance } = useBalance(balanceStudentId)
  const balanceLabel = parentMode
    ? `${childStudent?.displayName ?? 'Student'}'s time`
    : isPractice ? 'Practice time' : 'Screen time'

  // On navigation: name the page in the tab title and move focus to <main>,
  // so keyboard and screen-reader users start at the new page's content.
  const mainRef = useRef(null)
  const firstRender = useRef(true)
  const activeItem = items.find((item) => isActive(item, pathname))
  const pageTitle = pathname.startsWith('/play/') ? 'Quiz'
    : pathname.startsWith('/written/') ? 'Written answer'
    : pathname.startsWith('/quiz/') ? 'Question bank'
    : activeItem?.label
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · Cortex` : 'Cortex'
  }, [pageTitle])
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    mainRef.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [pathname])

  const signOutLabel = profile?.display_name ? `Sign out (${profile.display_name})` : 'Sign out'

  return (
    <WallpaperContext.Provider value={setWallpaperSubject}>
    <div className={styles.shell} data-sidebar-open={sidebarOpen || undefined}>
      {/* Subject wallpaper: decorative, behind the page content. */}
      <div
        className={styles.wallpaper}
        data-on={wallpaper ? '' : undefined}
        style={wallpaper ? { backgroundImage: `url("${wallpaper}")` } : undefined}
        aria-hidden="true"
      />
      <a href="#main" className={styles.skip}>Skip to content</a>

      {/* Phone header */}
      <header className={styles.topbar}>
        <Link to={parentMode ? '/parent' : '/'} className={styles.brand} aria-label="Cortex home">
          <span className="wordmark">CORTEX</span>
        </Link>
        <div className={styles.topbarEnd}>
          {isPractice && !parentMode && <span className={styles.practiceBadge}>Practice</span>}
          <RoleSwitch view={parentMode ? 'parent' : 'student'} />
          <Balance value={balance} label={balanceLabel} compact />
          <button type="button" className={`${styles.iconButton} ${styles.topbarButton}`} onClick={signOut} aria-label={signOutLabel} title={signOutLabel}>
            <Icon name="signout" />
          </button>
        </div>
      </header>

      {/* Tablet / desktop sidebar */}
      <aside className={styles.sidebar} aria-label="Sidebar">
        <div className={styles.sidebarTop}>
          <Link to={parentMode ? '/parent' : '/'} className={styles.brand} aria-label="Cortex home">
            <span className={`wordmark ${styles.sidebarWordmark}`}>CORTEX</span>
            <span className={`wordmark ${styles.sidebarMonogram}`} aria-hidden="true">C</span>
          </Link>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.collapseToggle}`}
            onClick={() => setSidebarOpen((open) => !open)}
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Icon name="sidebar" />
          </button>
        </div>

        <div className={styles.sidebarBalance}>
          <Balance value={balance} label={balanceLabel} />
        </div>

        <nav aria-label={parentMode ? 'Parent' : 'Student'} className={styles.sidebarNav}>
          <NavLinks items={items} pathname={pathname} className={styles.sideList} linkClassName={styles.sideLink} />
        </nav>

        <div className={styles.sidebarFooter}>
          {isPractice && !parentMode && <span className={styles.practiceBadge}>Practice mode</span>}
          <RoleSwitch view={parentMode ? 'parent' : 'student'} />
          <button type="button" className={styles.sideLink} onClick={signOut} title={signOutLabel}>
            <Icon name="signout" />
            <span className={styles.navLabel}>{signOutLabel}</span>
          </button>
        </div>
      </aside>

      <main id="main" ref={mainRef} className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>

      {/* Phone tab bar */}
      <nav aria-label={parentMode ? 'Parent' : 'Student'} className={styles.tabbar} data-tabbar="">
        <NavLinks items={items} pathname={pathname} className={styles.tabList} linkClassName={styles.tabLink} labelKey="short" />
      </nav>
    </div>
    </WallpaperContext.Provider>
  )
}
