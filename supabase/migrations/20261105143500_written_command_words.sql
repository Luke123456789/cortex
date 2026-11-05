-- AQA science papers use "determine" and AQA English Literature questions use
-- "explore", so both are valid command words for written questions.
alter table public.fm_exam_questions drop constraint fm_exam_questions_command_word_check;
alter table public.fm_exam_questions add constraint fm_exam_questions_command_word_check
  check (command_word = any (array['state', 'describe', 'explain', 'evaluate', 'compare', 'justify', 'calculate', 'analyse', 'determine', 'explore']));
