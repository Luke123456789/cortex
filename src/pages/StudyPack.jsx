import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useAssignments } from '../hooks/useAssignments'
import { useStudyPacks } from '../hooks/useStudyPacks'
import { useCatalogNames } from '../hooks/useCatalogNames'
import { useSubjectWallpaper } from '../components/shell/Wallpaper.jsx'
import { assignmentAction } from '../lib/assignments'
import { packProgress, PACK_STEP_LABELS, EXAM_GROUP } from '../lib/studyPacks'
import { dueLabel } from '../lib/week'
import styles from './StudyPack.module.css'

function shortDate(iso) {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' })
}

// One study pack: every step grouped by lesson, ticked off as it's done, with
// the next one to do picked out. Steps can be done in any order, and any
// pending pack can be worked on (packs are no longer queued per subject).
export default function StudyPack() {
  const { packId } = useParams()
  const { studentId } = useAuth()
  const { assignments, loading } = useAssignments(studentId)
  const { packs, loading: packsLoading } = useStudyPacks(studentId, assignments)
  const names = useCatalogNames()
  const [lessonNames, setLessonNames] = useState(new Map())

  const pack = packs.find((p) => p.id === packId)
  const progress = useMemo(() => packProgress(assignments.filter((a) => a.pack_id === packId)), [assignments, packId])
  const isCurrent = pack?.status === 'pending'
  useSubjectWallpaper(names.subjects.get(pack?.subject_id))

  const subtopicIds = useMemo(() => [...new Set(progress.items.map((a) => a.subtopic_id).filter(Boolean))], [progress.items])
  useEffect(() => {
    if (!subtopicIds.length) return
    let cancelled = false
    supabase.from('subtopics').select('id, name').in('id', subtopicIds).then(({ data, error }) => {
      if (error) console.error('Failed to load lesson names', error)
      if (!cancelled) setLessonNames(new Map((data || []).map((s) => [s.id, s.name])))
    })
    return () => { cancelled = true }
  }, [subtopicIds])

  // Steps grouped by lesson, in pack order; the exam set has no lesson.
  const groups = useMemo(() => {
    const out = []
    for (const a of progress.items) {
      const name = a.subtopic_id ? lessonNames.get(a.subtopic_id) || 'Lesson' : EXAM_GROUP
      const last = out[out.length - 1]
      if (last && last.name === name) last.steps.push(a)
      else out.push({ name, steps: [a] })
    }
    return out
  }, [progress.items, lessonNames])

  if (loading || packsLoading) return <div className="page"><p className="empty">Loading…</p></div>
  if (!pack) {
    return (
      <div className="page">
        <Link to="/assignments" className="back-link">← Your week</Link>
        <p className="empty">This study pack isn’t available.</p>
      </div>
    )
  }

  const { done, total, next } = progress
  const where = [names.subjects.get(pack.subject_id), names.topics.get(pack.topic_id)].filter(Boolean).join(' · ')

  return (
    <div className="page">
      <Link to="/assignments" className="back-link">← Your week</Link>
      <header className={styles.head}>
        <p className="section-label">Study pack{where ? ` · ${where}` : ''}</p>
        <h1 className={styles.title}>{pack.title}</h1>
        <p className={styles.summary}>
          {done} of {total} done
          {pack.due_at && pack.status === 'pending' ? ` · ${dueLabel(pack.due_at)}` : ''}
        </p>
        <div className={styles.bar} role="img" aria-label={`${done} of ${total} steps done`}>
          <div className={styles.barFill} style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
        {pack.note && <p className={styles.note}>{pack.note}</p>}
      </header>

      {pack.status === 'completed' && (
        <p className={styles.banner} data-tone="done" role="status">Pack complete. Well done.</p>
      )}
      {pack.status === 'cancelled' && (
        <p className={styles.banner} role="status">This pack was cancelled.</p>
      )}
      {isCurrent && next && (
        <div className={`card ${styles.next}`}>
          <div>
            <p className="section-label">Next up</p>
            <p className={styles.nextTitle}>{next.title}</p>
          </div>
          {assignmentAction(next) && (
            <Link to={assignmentAction(next).to} className="btn btn--primary">{assignmentAction(next).label}</Link>
          )}
        </div>
      )}

      {groups.map((g) => (
        <section key={g.name} className={styles.group} aria-label={g.name}>
          <h2 className={styles.lesson}>{g.name}</h2>
          <ol className={styles.steps}>
            {g.steps.map((a) => {
              const action = assignmentAction(a)
              const isNext = isCurrent && next?.id === a.id
              return (
                <li key={a.id} className={styles.step} data-done={a.status === 'completed' || undefined} data-next={isNext || undefined}>
                  <span className={styles.mark} aria-hidden="true">{a.status === 'completed' ? '✓' : isNext ? '→' : ''}</span>
                  <div className={styles.stepText}>
                    <span className={styles.stepType}>{PACK_STEP_LABELS[a.type] || a.type}</span>
                    <span className="meta">
                      {a.status === 'completed' ? `Done ${shortDate(a.completed_at)}` : a.title}
                    </span>
                  </div>
                  {isCurrent && a.status === 'pending' && action && (
                    <Link to={action.to} className={`btn ${isNext ? 'btn--primary' : 'btn--secondary'} btn--small`}>{action.label}</Link>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
