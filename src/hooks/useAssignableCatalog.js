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
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)

    const [subjectsRes, topicsRes, subtopicsRes, quizzesRes, examQuestionsRes, papersRes] = await Promise.all([
      supabase.from('subjects').select('id, name').order('name'),
      supabase.from('topics').select('id, subject_id, name').order('display_order'),
      supabase.from('subtopics').select('id, topic_id, name').order('display_order'),
      // question_count is kept in step with active questions when content is
      // deactivated, so an emptied quiz drops out of the picker.
      supabase.from('quizzes').select('id, topic_id, title, question_count').gt('question_count', 0).order('display_order'),
      // Questions that belong to a mock paper are set through the paper.
      supabase.from('fm_exam_questions').select('id, topic_id, subtopic_id, question_text, command_word, total_marks').eq('active', true).is('paper_ref', null),
      supabase.from('fm_papers').select('ref, subject_id, title, duration_minutes, calculator, total_marks').eq('active', true).order('title'),
    ])

    if (subjectsRes.error) console.error('Failed to load subjects', subjectsRes.error)
    if (topicsRes.error) console.error('Failed to load topics', topicsRes.error)
    if (subtopicsRes.error) console.error('Failed to load subtopics', subtopicsRes.error)
    if (quizzesRes.error) console.error('Failed to load quizzes', quizzesRes.error)
    if (examQuestionsRes.error) console.error('Failed to load written test questions', examQuestionsRes.error)
    if (papersRes.error) console.error('Failed to load mock papers', papersRes.error)

    setSubjects(subjectsRes.data || [])
    setTopics(topicsRes.data || [])
    setSubtopics(subtopicsRes.data || [])
    setQuizzes(quizzesRes.data || [])
    setExamQuestions(examQuestionsRes.data || [])
    setPapers(papersRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return { subjects, topics, subtopics, quizzes, examQuestions, papers, loading, refresh: fetchAll }
}
