-- Reopening a tutor session the student had started but not finished resets
-- that row (TutorChat.startSession) and sets assignment_id, so finishing it
-- ticks off the study pack step it was opened from. The column-level UPDATE
-- grant on tutor_sessions never included assignment_id (added in the study
-- packs migration), so that reset failed with 403 and the step would not open.
-- RLS ("tutor_sessions: update as student", can_write_as) still applies.
grant update (assignment_id) on public.tutor_sessions to authenticated;
