// Who is calling, and which student are they acting for?
//
// Every check runs through the caller's own JWT (RLS + the SECURITY DEFINER
// helpers is_parent_of / can_write_as), never the service role, so a function
// can only act for a student the database itself says the caller may act for.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

export type Caller = {
  id: string
  role: 'student' | 'parent' | string
  client: SupabaseClient
}

export type Student = {
  id: string
  displayName: string | null
  isPractice: boolean
}

export async function getCaller(req: Request): Promise<Caller | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await client.auth.getUser()
  if (!user) return null
  const { data: profile } = await client.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return null
  return { id: user.id, role: profile.role, client }
}

async function rpcBool(caller: Caller, fn: string, studentId: string): Promise<boolean> {
  const { data, error } = await caller.client.rpc(fn, { p_student: studentId })
  if (error) {
    console.error(`${fn} failed`, error)
    return false
  }
  return data === true
}

async function loadStudent(caller: Caller, studentId: string): Promise<Student | null> {
  // Read through the caller's client: RLS only shows a profile the caller is
  // linked to (or their own), which doubles as a second check.
  const { data } = await caller.client
    .from('profiles')
    .select('id, role, display_name, is_practice')
    .eq('id', studentId)
    .maybeSingle()
  if (!data || data.role !== 'student') return null
  return { id: data.id, displayName: data.display_name, isPractice: !!data.is_practice }
}

// For student activity (tutor, quizzes): the student themselves, or a linked
// parent acting for their practice student. A request without studentId
// (the app before step 4) means "myself", which only works for a student.
export async function resolveWritableStudent(caller: Caller, requested: unknown): Promise<Student | null> {
  const studentId = typeof requested === 'string' && requested ? requested : caller.id
  if (!(await rpcBool(caller, 'can_write_as', studentId))) return null
  return loadStudent(caller, studentId)
}

// For parent actions (assessments): a parent linked to the student. Without
// studentId, falls back to the parent's one linked non-practice student, as
// the app did before step 4.
export async function resolveParentedStudent(caller: Caller, requested: unknown): Promise<Student | null> {
  if (caller.role !== 'parent') return null
  let studentId = typeof requested === 'string' && requested ? requested : null
  if (!studentId) {
    const { data: links } = await caller.client
      .from('student_links')
      .select('student_id, profiles!student_links_student_id_fkey(is_practice)')
      .eq('parent_id', caller.id)
    const real = (links ?? []).filter((l: any) => !l.profiles?.is_practice)
    if (real.length !== 1) return null
    studentId = real[0].student_id
  }
  if (!(await rpcBool(caller, 'is_parent_of', studentId!))) return null
  return loadStudent(caller, studentId!)
}
