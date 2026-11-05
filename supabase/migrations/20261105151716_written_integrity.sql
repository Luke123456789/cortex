-- How a written answer was produced (typed / pasted / dropped, tab switches,
-- typing speed) and the AI-writing signals from marking. Shown to parents;
-- a flag here sets needs_review but never changes the mark.
alter table public.fm_attempts add column if not exists integrity jsonb;
