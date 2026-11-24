-- A parent's "fresh start" date: their history views of this student only
-- show activity from this date. Nothing older is deleted.
alter table public.student_links add column if not exists history_from date;
