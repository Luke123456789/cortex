-- Step 5: drop the transitional student_id default (added in migration 3).
--
-- Every caller now sends student_id: the front end (steps 3-4, deployed),
-- the edge functions, and grade_and_claim_tutor_reward. Without the trigger,
-- an insert that forgets student_id fails on NOT NULL instead of being
-- silently attributed to the one real student.
begin;

drop trigger if exists fill_default_student_id on assessments;
drop trigger if exists fill_default_student_id on assignments;
drop trigger if exists fill_default_student_id on ledger_entries;
drop trigger if exists fill_default_student_id on redemption_requests;
drop trigger if exists fill_default_student_id on subject_locks;
drop function if exists public.fill_default_student_id();

commit;
