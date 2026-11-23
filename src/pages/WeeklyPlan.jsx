import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth.jsx'
import { useWeeklyPlan } from '../hooks/useWeeklyPlan'
import { mondayOf, shiftWeek, weekLabel, planShareText } from '../lib/weeklyPlan'
import WeeklyPlanProgress from '../components/WeeklyPlanProgress'
import ShareButton from '../components/ShareButton'
import styles from './WeeklyPlan.module.css'

const EMPTY = { study_minutes: 0, tutor_sessions: 0, exam_questions: 0, quizzes: 0, subject_ids: [], note: '' }

function NumberField({ id, label, hint, value, onChange, max, step = 1 }) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <input id={id} className="field" type="number" inputMode="numeric" min={0} max={max} step={step}
        value={value} onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))} />
      {hint && <p className="meta">{hint}</p>}
    </div>
  )
}

// Parent: set the student's targets for a week, see progress against them,
// and share either on WhatsApp.
export default function WeeklyPlan() {
  const { user, childStudent } = useAuth()
  const studentId = childStudent?.id
  const name = childStudent?.displayName
  const thisWeek = mondayOf()
  const [weekStart, setWeekStart] = useState(thisWeek)
  const { loading, error, plan, subjects, progress, reload } = useWeeklyPlan(studentId, weekStart)
  const [form, setForm] = useState(EMPTY)
  const [hours, setHours] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  useEffect(() => {
    const p = plan ?? EMPTY
    setForm({ ...EMPTY, ...p, note: p.note ?? '' })
    setHours(Math.round(((p.study_minutes ?? 0) / 60) * 2) / 2)
    setSaveMsg(null)
  }, [plan, weekStart])

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const toggleSubject = (id) =>
    setForm((f) => ({ ...f, subject_ids: f.subject_ids.includes(id) ? f.subject_ids.filter((x) => x !== id) : [...f.subject_ids, id] }))

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    const row = {
      student_id: studentId,
      week_start: weekStart,
      set_by: user.id,
      study_minutes: Math.round(hours * 60),
      tutor_sessions: form.tutor_sessions,
      exam_questions: form.exam_questions,
      quizzes: form.quizzes,
      subject_ids: form.subject_ids,
      note: form.note.trim() || null,
    }
    const { error: err } = await supabase.from('weekly_plans').upsert(row, { onConflict: 'student_id,week_start' })
    setSaving(false)
    if (err) {
      console.error('Failed to save weekly plan', err)
      setSaveMsg({ error: true, text: 'Could not save the plan. Try again.' })
      return
    }
    setSaveMsg({ error: false, text: 'Plan saved.' })
    reload()
  }

  const subjectNames = useMemo(
    () => (plan?.subject_ids ?? []).map((id) => {
      const s = subjects.find((x) => x.id === id)
      return s ? { name: s.name, covered: progress?.subjects.has(id) } : null
    }).filter(Boolean),
    [plan, subjects, progress],
  )

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
              : <p className="meta">No plan set for this week. {progress && `${progress.tutorSessions} tutor sessions, ${progress.examQuestions} exam questions and ${progress.quizzes} quizzes done.`}</p>}
            {plan && (
              <div className={styles.shareRow}>
                <ShareButton label="Share plan" className="btn btn--secondary btn--small"
                  getText={() => planShareText({ plan, name, subjectNames, weekStart })} />
                <ShareButton label="Share progress" className="btn btn--primary btn--small"
                  getText={() => planShareText({ plan, name, subjectNames, progress, weekStart })} />
              </div>
            )}
          </section>

          <form className={`card ${styles.section} ${styles.form}`} onSubmit={save} aria-labelledby="targets-title">
            <h2 id="targets-title" className="section-label">{plan ? 'Targets' : 'Set targets'}</h2>
            <div className={styles.grid}>
              <NumberField id="wp-hours" label="Study time (hours)" hint="Estimated from active time in the app" value={hours} onChange={setHours} max={50} step={0.5} />
              <NumberField id="wp-tutor" label="Tutor sessions" hint="Finished and graded" value={form.tutor_sessions} onChange={set('tutor_sessions')} max={50} />
              <NumberField id="wp-exam" label="Exam questions" hint="Written answers, marked" value={form.exam_questions} onChange={set('exam_questions')} max={200} />
              <NumberField id="wp-quiz" label="Quizzes" value={form.quizzes} onChange={set('quizzes')} max={100} />
            </div>

            <fieldset className={styles.subjects}>
              <legend className="field-label">Focus subjects</legend>
              <div className="chips">
                {subjects.map((s) => (
                  <label key={s.id} className={`chip ${styles.subjectChip}`} data-on={form.subject_ids.includes(s.id) || undefined}>
                    <input type="checkbox" className="visually-hidden" checked={form.subject_ids.includes(s.id)} onChange={() => toggleSubject(s.id)} />
                    {s.name}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label className="field-label" htmlFor="wp-note">Note for {name || 'the student'}</label>
              <textarea id="wp-note" className="field" rows={3} maxLength={500} value={form.note} onChange={(e) => set('note')(e.target.value)}
                placeholder="e.g. Mocks are done — focus on the 6-mark questions in Economics." />
            </div>

            <button type="submit" className="btn btn--primary btn--block" disabled={saving}>{saving ? 'Saving…' : plan ? 'Update plan' : 'Save plan'}</button>
            {saveMsg && <p className={saveMsg.error ? 'error-text' : 'meta'} role="status">{saveMsg.text}</p>}
          </form>
        </>
      )}
    </div>
  )
}
