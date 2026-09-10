import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

// Everything the parent's "Assign work" screen needs to build cascading
// subject -> topic -> (subtopic | quiz | written-test question) pickers,
// fetched once and filtered client-side, same approach as useSubjectLocks.
export function useAssignableCatalog() {
  const [subjects, setSubjects] = useState([])
  const [topics, setTopics] = useState([])
  const [subtopics, setSubtopics] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [examQuestions, setExamQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)

    const [subjectsRes, topicsRes, subtopicsRes, quizzesRes, examQuestionsRes] = await Promise.all([
      supabase.from('subjects').select('id, name').order('name'),
      supabase.from('topics').select('id, subject_id, name').order('display_order'),
      supabase.from('subtopics').select('id, topic_id, name').order('display_order'),
      supabase.from('quizzes').select('id, topic_id, title, question_count').order('display_order'),
      supabase.from('fm_exam_questions').select('id, topic_id, subtopic_id, question_text, command_word, total_marks').eq('active', true),
    ])

    if (subjectsRes.error) console.error('Failed to load subjects', subjectsRes.error)
    if (topicsRes.error) console.error('Failed to load topics', topicsRes.error)
    if (subtopicsRes.error) console.error('Failed to load subtopics', subtopicsRes.error)
    if (quizzesRes.error) console.error('Failed to load quizzes', quizzesRes.error)
    if (examQuestionsRes.error) console.error('Failed to load written test questions', examQuestionsRes.error)

    setSubjects(subjectsRes.data || [])
    setTopics(topicsRes.data || [])
    setSubtopics(subtopicsRes.data || [])
    setQuizzes(quizzesRes.data || [])
    setExamQuestions(examQuestionsRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return { subjects, topics, subtopics, quizzes, examQuestions, loading, refresh: fetchAll }
}
