-- Rollback: unlink C6-C10 questions and remove their subtopics. Run as one transaction.
update questions set subtopic_id = null where topic_id in (select t.id from topics t join subjects s on s.id = t.subject_id where s.name = 'Chemistry' and t.spec_ref in ('C6','C7','C8','C9','C10'));
delete from subtopics where topic_id in (select t.id from topics t join subjects s on s.id = t.subject_id where s.name = 'Chemistry' and t.spec_ref in ('C6','C7','C8','C9','C10'));
