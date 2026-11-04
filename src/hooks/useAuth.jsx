import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

// Who the signed-in user acts for:
//  * a student acts for themselves everywhere;
//  * a parent's student view (/, /tutor, /quizzes, ...) runs as their
//    practice student, so trying things out never touches the real
//    student's data, balance or assignments;
//  * a parent's own pages (/parent/...) look after their real student.
// Every query and write is scoped by these ids; RLS enforces the same rules.
async function loadStudents(currentUser, role) {
  if (role === 'student') return { studentId: currentUser.id, linkedStudents: [] }
  if (role !== 'parent') return { studentId: null, linkedStudents: [] }

  const { data, error } = await supabase
    .from('student_links')
    .select('student_id, profiles!student_links_student_id_fkey (id, display_name, is_practice)')
    .eq('parent_id', currentUser.id)
  if (error) {
    console.error('Failed to load linked students', error)
    return { studentId: null, linkedStudents: [] }
  }
  const linkedStudents = (data || [])
    .map((l) => l.profiles)
    .filter(Boolean)
    .map((p) => ({ id: p.id, displayName: p.display_name, isPractice: !!p.is_practice }))
  const practice = linkedStudents.find((s) => s.isPractice)
  return { studentId: practice?.id ?? null, linkedStudents }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [students, setStudents] = useState({ studentId: null, linkedStudents: [] })
  const [loading, setLoading] = useState(true)

  async function loadProfile(currentUser) {
    if (!currentUser) {
      setProfile(null)
      setStudents({ studentId: null, linkedStudents: [] })
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('role, display_name')
      .eq('id', currentUser.id)
      .single()

    if (error) {
      console.error('Failed to load profile', error)
      setProfile(null)
      setStudents({ studentId: null, linkedStudents: [] })
    } else {
      setStudents(await loadStudents(currentUser, data.role))
      setProfile(data)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      loadProfile(session?.user ?? null).finally(() => setLoading(false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      loadProfile(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const isParent = profile?.role === 'parent'
  // The real (non-practice) students a parent looks after; the parent pages
  // use the first one (there is one today).
  const children_ = students.linkedStudents.filter((s) => !s.isPractice)

  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    // Student view: whose data the student screens show and write.
    studentId: students.studentId,
    isPractice: isParent && !!students.studentId,
    // Parent pages: the real student being looked after.
    childStudent: children_[0] ?? null,
    linkedStudents: students.linkedStudents,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider')
  return ctx
}
