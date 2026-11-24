import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useWeeklyPlan } from '../hooks/useWeeklyPlan'
import { usePlanHistory } from '../hooks/usePlanHistory'
import { useAssignableCatalog } from '../hooks/useAssignableCatalog'
import { mondayOf, shiftWeek, weekLabel, planShareText, fmtMinutes } from '../lib/weeklyPlan'
import { proposeWork, swapItem, removeItem, toAssignmentRows, keyOfAssignment, PLAN_TYPE_LABELS, estimateAssignment, plannedBySubject, timeCheck, fillToHours } from '../lib/planProposal'
import WeeklyPlanProgress from '../components/WeeklyPlanProgress'
import ShareButton from '../components/ShareButton'
import styles from './WeeklyPlan.module.css'

const EMPTY = { subject_minutes: {}, tutor_sessions: 0, exam_questions: 0, papers: 0, quizzes: 0, note: '' }
const TYPE_ORDER = ['tutor_session', 'written_test', 'mock_paper', 'quiz']

function NumberField({ id, label, hint, value, onChange, max, step = 1 }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <input id={id} className="field" type="number" inputMode="decimal" min={0} max={max} step={step}
        value={value} onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))} />
      {hint && <p className="meta">{hint}</p>}
    </div>
  )
}

const STATUS_TEXT = { completed: 'Done', pending: 'To do', expired: 'Not done', cancelled: 'Removed' }

// Parent: set the week's targets, let the app propose the specific work,
// swap or remove items, then approve to send it to the student. Progress and
// a WhatsApp share for both the plan and the check-in.
export default function WeeklyPlan() {
  const { user, childStudent } = useAuth()
  const studentId = childStudent?.id
  const name = childStudent?.displayName
  const thisWeek = mondayOf()
  const [weekStart, setWeekStart] = useState(thisWeek)
  const { loading, error, plan, subjects, progress, items, reload } = useWeeklyPlan(studentId, weekStart)
  const history = usePlanHistory(studentId)
  const catalog = useAssignableCatalog()
  const [form, setForm] = useState(EMPTY)
  const [proposal, setProposal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    const p = plan ?? EMPTY
    const minutes = p.subject_minutes && Object.keys(p.subject_minutes).length
      ? p.subject_minutes
      : Object.fromEntries((p.subject_ids ?? []).map((id) => [id, Math.round((p.study_minutes ?? 0) / Math.max(1, (p.subject_ids ?? []).length))]))
    setForm({ ...EMPTY, ...p, subject_minutes: minutes, note: p.note ?? '', papers: p.papers ?? 0 })
    setProposal(null)
    setMsg(null)
  }, [plan, weekStart])

  const liveItems = useMemo(() => items.filter((i) => i.status !== 'cancelled'), [items])
  // Already-set work as estimate-carrying items (expired work no longer counts).
  const setEst = useMemo(
    () => (catalog.loading ? [] : liveItems.filter((i) => i.status !== 'expired').map((i) => ({ key: keyOfAssignment(i), subject_id: i.subject_id, est: estimateAssignment(i, catalog) }))),
    [liveItems, catalog],
  )
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const setHours = (id, hours) => setForm((f) => ({ ...f, subject_minutes: { ...f.subject_minutes, [id]: Math.round(hours * 60) } }))
  const focusIds = Object.entries(form.subject_minutes).filter(([, m]) => m > 0).map(([id]) => id)

  function planRow() {
    const minutes = Object.fromEntries(Object.entries(form.subject_minutes).filter(([, m]) => m > 0))
    return {
      student_id: studentId,
      week_start: weekStart,
      set_by: user.id,
      subject_minutes: minutes,
      subject_ids: Object.keys(minutes),
      study_minutes: Object.values(minutes).reduce((a, b) => a + b, 0),
      tutor_sessions: form.tutor_sessions,
      exam_questions: form.exam_questions,
      papers: form.papers,
      quizzes: form.quizzes,
      note: form.note.trim() || null,
    }
  }

  async function savePlan(extra = {}) {
    const { data, error: err } = await supabase.from('weekly_plans')
      .upsert({ ...planRow(), ...extra }, { onConflict: 'student_id,week_start' }).select('id').single()
    if (err) throw err
    return data.id
  }

  function propose() {
    setMsg(null)
    if (!focusIds.length) { setMsg({ error: true, text: 'Give at least one subject some hours first.' }); return }
    if (!history.history || catalog.loading) { setMsg({ error: true, text: 'Still loading his history — try again in a moment.' }); return }
    const existing = liveItems.filter((i) => i.status !== 'expired').map((i) => ({ type: i.type, key: keyOfAssignment(i) }))
    const p = proposeWork(
      { subjectMinutes: Object.fromEntries(focusIds.map((id) => [id, form.subject_minutes[id]])), tutor_sessions: form.tutor_sessions, exam_questions: form.exam_questions, papers: form.papers, quizzes: form.quizzes },
      { catalog, history: history.history },
      existing,
    )
    setProposal(p)
    if (!p.items.length) setMsg({ error: false, text: liveItems.length ? 'The set work already covers these targets.' : 'Nothing to propose for these targets.' })
  }

  function fillHours() {
    if (!proposal || !history.history) return
    const minutes = Object.fromEntries(focusIds.map((id) => [id, form.subject_minutes[id]]))
    const next = fillToHours(proposal, minutes, { catalog, history: history.history }, setEst)
    setProposal(next)
    const n = Object.values(next.added).reduce((a, b) => a + b, 0)
    setMsg({ error: false, text: n ? `Added ${n} item${n > 1 ? 's' : ''} to reach the hours.` : 'No more new content to add for the short subjects.' })
  }

  async function saveTargetsOnly(e) {
    e?.preventDefault()
    setBusy(true)
    try {
      await savePlan()
      setMsg({ error: false, text: 'Targets saved.' })
      reload()
    } catch (err) {
      console.error('Failed to save weekly plan', err)
      setMsg({ error: true, text: 'Could not save the plan. Try again.' })
    } finally {
      setBusy(false)
    }
  }

  async function approve() {
    if (!proposal?.items.length) return
    setBusy(true)
    setMsg(null)
    try {
      const planId = await savePlan({ approved_at: new Date().toISOString() })
      const rows = toAssignmentRows(proposal.items, { studentId, parentId: user.id, planId, weekStart, note: form.note.trim() })
      const { error: err } = await supabase.from('assignments').insert(rows)
      if (err) throw err
      setProposal(null)
      setMsg({ error: false, text: `Sent ${rows.length} pieces of work to ${name || 'the student'}, due by Sunday.` })
      reload()
      history.reload()
    } catch (err) {
      console.error('Failed to approve plan work', err)
      setMsg({ error: true, text: 'Could not send the work. Try again.' })
    } finally {
      setBusy(false)
    }
  }

  async function removeSetItem(id) {
    const { error: err } = await supabase.from('assignments').update({ status: 'cancelled' }).eq('id', id).eq('status', 'pending')
    if (err) { setMsg({ error: true, text: 'Could not remove that item.' }); return }
    reload()
    history.reload()
  }

  const subjectNames = useMemo(
    () => Object.keys(plan?.subject_minutes ?? {}).map((id) => {
      const s = subjects.find((x) => x.id === id)
      return s ? { name: s.name, covered: progress?.subjects.has(id) } : null
    }).filter(Boolean),
    [plan, subjects, progress],
  )
  const shareItems = liveItems.map((i) => ({ title: i.title, status: i.status }))
  const subjectName = (id) => subjects.find((s) => s.id === id)?.name ?? ''

  const focusMinutes = Object.fromEntries(focusIds.map((id) => [id, form.subject_minutes[id]]))
  const proposedCheck = proposal ? timeCheck(focusMinutes, plannedBySubject([...setEst, ...proposal.items])) : []
  const setCheck = plan ? timeCheck(plan.subject_minutes ?? {}, plannedBySubject(setEst)) : []
  const checkLine = (c) => `${subjectName(c.subject_id)}: ≈ ${fmtMinutes(c.planned)} of ${fmtMinutes(c.target)}${c.status === 'short' ? ` — ${fmtMinutes(c.gap)} short` : c.status === 'over' ? ` — ${fmtMinutes(-c.gap)} over` : ' ✓'}`

  const isPast = weekStart < thisWeek
  const weekName = weekStart === thisWeek ? 'This week' : weekStart === shiftWeek(thisWeek, 1) ? 'Next week' : weekStart === shiftWeek(thisWeek, -1) ? 'Last week' : 'Week of'

  if (!studentId) return <div className="page"><p className="empty">No student linked yet.</p></div>

  return (
    <div className="page">
      <h1 className="section-label">Weekly plan{name ? ` · ${name}` : ''}</h1>

      <div className={styles.weekNav}>
        <button type="button" className="btn btn--secondary btn--small" onClick={() => setWeekStart((w) => shiftWeek(w, -1))} aria-label="Previous week">‹</button>
        <div className={styles.weekTitle}>
          <strong>{weekName}</strong>
          <span className="meta">{weekLabel(weekStart)}</span>
        </div>
        <button type="button" className="btn btn--secondary btn--small" onClick={() => setWeekStart((w) => shiftWeek(w, 1))} aria-label="Next week">›</button>
      </div>

      {error && <p className="error-text" role="alert">{error}</p>}

      {loading ? <p className="empty">Loading…</p> : (
        <>
          <section className={`card ${styles.section}`} aria-labelledby="progress-title">
            <h2 id="progress-title" className="section-label">{isPast ? 'How the week went' : 'Progress so far'}</h2>
            {plan
              ? <WeeklyPlanProgress plan={plan} progress={progress} subjects={subjects} />
              : <p className="meta">No plan set for this week.</p>}

            {liveItems.length > 0 && (
              <div className={styles.setWork}>
                <h3 className="field-label">Set work ({liveItems.filter((i) => i.status === 'completed').length}/{liveItems.length} done)</h3>
                {setCheck.length > 0 && (
                  <ul className={styles.timeCheck} aria-label="Set work against the hours">
                    {setCheck.map((c) => <li key={c.subject_id} data-status={c.status}>{checkLine(c)}</li>)}
                  </ul>
                )}
                <ul className={styles.itemList}>
                  {liveItems.map((i) => (
                    <li key={i.id} className={styles.item} data-status={i.status}>
                      <span className={styles.itemTick} aria-hidden="true">{i.status === 'completed' ? '✓' : i.status === 'expired' ? '✗' : '○'}</span>
                      <span className={styles.itemText}>
                        <span>{i.title}</span>
                        <span className="meta">{PLAN_TYPE_LABELS[i.type] ?? i.type} · {subjectName(i.subject_id)}{catalog.loading ? '' : ` · ≈ ${fmtMinutes(estimateAssignment(i, catalog))}`} · {STATUS_TEXT[i.status] ?? i.status}</span>
                      </span>
                      {i.status === 'pending' && !isPast && (
                        <button type="button" className="btn btn--small btn--soft" onClick={() => removeSetItem(i.id)} aria-label={`Remove ${i.title}`}>Remove</button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {plan && (
              <div className={styles.shareRow}>
                <ShareButton label="Share plan" className="btn btn--secondary btn--small"
                  getText={() => planShareText({ plan, name, subjectNames, subjects, items: shareItems, weekStart })} />
                <ShareButton label="Share progress" className="btn btn--primary btn--small"
                  getText={() => planShareText({ plan, name, subjectNames, subjects, items: shareItems, progress, weekStart })} />
              </div>
            )}
          </section>

          {!isPast && (
            <form className={`card ${styles.section} ${styles.form}`} onSubmit={saveTargetsOnly} aria-labelledby="targets-title">
              <h2 id="targets-title" className="section-label">{plan ? 'Targets' : 'Set targets'}</h2>

              <fieldset className={styles.subjects}>
                <legend className="field-label">Hours per subject</legend>
                <div className={styles.hoursGrid}>
                  {subjects.map((s) => (
                    <label key={s.id} className={styles.hoursRow} data-on={(form.subject_minutes[s.id] ?? 0) > 0 || undefined}>
                      <span>{s.name}</span>
                      <input className={`field ${styles.hoursInput}`} type="number" inputMode="decimal" min={0} max={20} step={0.5}
                        value={(form.subject_minutes[s.id] ?? 0) / 60}
                        onChange={(e) => setHours(s.id, Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
                        aria-label={`${s.name} hours`} />
                      <span className="meta">h</span>
                    </label>
                  ))}
                </div>
                <p className="meta">The work below is split across these subjects in proportion to their hours.</p>
              </fieldset>

              <div className={styles.grid}>
                <NumberField id="wp-tutor" label="Tutor sessions" value={form.tutor_sessions} onChange={set('tutor_sessions')} max={50} />
                <NumberField id="wp-exam" label="Written answers" value={form.exam_questions} onChange={set('exam_questions')} max={200} />
                <NumberField id="wp-papers" label="Exam papers" value={form.papers} onChange={set('papers')} max={20} />
                <NumberField id="wp-quiz" label="Quizzes" value={form.quizzes} onChange={set('quizzes')} max={100} />
              </div>

              <div>
                <label className="field-label" htmlFor="wp-note">Note for {name || 'the student'}</label>
                <textarea id="wp-note" className="field" rows={3} maxLength={500} value={form.note} onChange={(e) => set('note')(e.target.value)}
                  placeholder="e.g. Mocks are done — focus on the 6-mark questions." />
              </div>

              <div className={styles.actions}>
                <button type="button" className="btn btn--primary" onClick={propose} disabled={busy || history.loading || catalog.loading}>
                  {liveItems.length ? 'Propose work to reach targets' : 'Propose this week\'s work'}
                </button>
                <button type="submit" className="btn btn--secondary" disabled={busy}>Save targets only</button>
              </div>
              {history.error && <p className="error-text">{history.error}</p>}
            </form>
          )}

          {proposal && proposal.items.length > 0 && (
            <section className={`card card--strong ${styles.section}`} aria-labelledby="proposal-title">
              <h2 id="proposal-title" className="section-label">Proposed work ({proposal.items.length})</h2>
              <p className="meta">Weakest topics first, then topics he hasn&apos;t done. Swap or remove anything, then approve to send it to {name || 'the student'}, due by Sunday.</p>
              <div className={styles.timeBox}>
                <span className="field-label">Time against your hours{setEst.length ? ' (including work already set)' : ''}</span>
                <ul className={styles.timeCheck}>
                  {proposedCheck.map((c) => <li key={c.subject_id} data-status={c.status}>{checkLine(c)}</li>)}
                </ul>
                {proposedCheck.some((c) => c.status === 'short') && (
                  <button type="button" className="btn btn--secondary btn--small" onClick={fillHours}>Fill to hours</button>
                )}
                <p className="meta">Estimates: written answers ≈ 1.5 min per mark, tutor session ≈ 20 min, quiz ≈ 45 s per question, papers at their real length.</p>
              </div>
              {TYPE_ORDER.map((type) => {
                const list = proposal.items.filter((i) => i.type === type)
                if (!list.length) return null
                return (
                  <div key={type}>
                    <h3 className="field-label">{PLAN_TYPE_LABELS[type]}s</h3>
                    <ul className={styles.itemList}>
                      {list.map((i) => {
                        const canSwap = (proposal.pools[`${i.type}:${i.subject_id}`] ?? []).some((c) => !proposal.items.some((x) => x.key === c.key))
                        return (
                          <li key={i.key} className={styles.item}>
                            <span className={styles.itemText}>
                              <span>{i.title}</span>
                              <span className="meta">{subjectName(i.subject_id)} · ≈ {fmtMinutes(i.est ?? 0)}</span>
                            </span>
                            <span className={styles.itemButtons}>
                              <button type="button" className="btn btn--small btn--soft" onClick={() => setProposal((p) => swapItem(p, i.key))} disabled={!canSwap}>Swap</button>
                              <button type="button" className="btn btn--small btn--soft" onClick={() => setProposal((p) => removeItem(p, i.key))} aria-label={`Remove ${i.title}`}>✕</button>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
              {Object.keys(proposal.shortfall).length > 0 && (
                <p className="meta">Not enough new content for: {Object.entries(proposal.shortfall).map(([t, n]) => `${n} ${PLAN_TYPE_LABELS[t].toLowerCase()}${n > 1 ? 's' : ''}`).join(', ')}.</p>
              )}
              <div className={styles.actions}>
                <button type="button" className="btn btn--primary" onClick={approve} disabled={busy}>{busy ? 'Sending…' : `Approve and send to ${name || 'student'}`}</button>
                <button type="button" className="btn btn--secondary" onClick={() => setProposal(null)} disabled={busy}>Discard</button>
              </div>
            </section>
          )}

          {msg && <p className={msg.error ? 'error-text' : 'meta'} role="status">{msg.text}</p>}
        </>
      )}
    </div>
  )
}
