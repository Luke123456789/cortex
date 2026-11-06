// Changes to quiz content that make scores before and after a date not
// directly comparable (e.g. wrong answers rewritten so the right one no
// longer stands out). Shown on Analytics next to the affected subject.
export const CONTENT_CHANGES = [
  {
    subject: 'English Literature',
    date: '2026-11-06',
    note: 'Quiz wrong answers rewritten so the right answer no longer stands out. Expect lower scores from here; it reflects harder questions, not a drop in ability.',
  },
]

export function changesFor(subjectName) {
  return CONTENT_CHANGES.filter((c) => c.subject === subjectName)
}
