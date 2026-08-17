-- ============================================
-- Clean up duplicate quiz_answers rows caused by the missing-DELETE-policy bug
-- ============================================
--
-- CONTEXT: saveQuizAnswer() used to delete-then-insert on every answer save
-- (including the periodic 12s autosave), but there was no RLS policy allowing a
-- student to DELETE their own quiz_answers rows, so the delete silently affected
-- 0 rows and a new duplicate row was inserted every time instead. The app code
-- and RLS policies have been fixed (see scripts/harden_quiz_grading_rls.sql), so
-- this won't happen again going forward. This script is a ONE-TIME cleanup of
-- the duplicates that already accumulated.
--
-- quiz_answers has NO created_at/updated_at column (confirmed via
-- information_schema.columns) — there is no timestamp to reliably order by.
-- Since the old bug path only ever INSERTed (the delete always no-op'd, nothing
-- was ever updated in place either), each row's physical insertion order is
-- preserved in practice, so we use ctid (physical row location) as a best-effort
-- proxy for "most recently saved" per (attempt_id, question_id) and keep that
-- one, deleting the rest. This is a heuristic, not a guarantee — Postgres does
-- not formally promise ctid tracks insert order. Step 0 below tells you, per
-- affected group, whether the duplicates actually differ in content: if
-- distinct_answers = 1, every copy is identical and it truly doesn't matter
-- which one survives; only groups with distinct_answers > 1 carry any real risk
-- of losing the student's actual final answer.
--
-- HOW TO RUN:
-- 1. Take a database backup / snapshot first — this deletes rows.
-- 2. Run Step 0 and Step 1 (both read-only) and review the output, especially
--    any row where distinct_answers > 1.
-- 3. Only then run Step 2 (the actual delete) and Step 3 (the constraint that
--    prevents recurrence).
-- 4. After cleanup, re-open the affected quizzes' Grade page as staff and click
--    "Finalize" on any attempt that was already graded/submitted, so its score
--    gets recomputed from the now-deduplicated answers.
-- ============================================

-- Step 0: Overview of every affected (attempt_id, question_id) group, and
-- whether the duplicate copies actually differ in content.
select
  qa.attempt_id,
  qa.question_id,
  count(*) as row_count,
  count(distinct qa.answer_payload) as distinct_answers,
  count(distinct qa.is_correct) as distinct_is_correct,
  count(distinct qa.points_awarded) as distinct_points_awarded
from quiz_answers qa
group by qa.attempt_id, qa.question_id
having count(*) > 1
order by row_count desc;

-- Step 1: Preview exactly which row would be KEPT vs DELETED for each group
-- (kept = physically-last-inserted row per the ctid heuristic above).
with ranked as (
  select
    id,
    attempt_id,
    question_id,
    answer_payload,
    is_correct,
    points_awarded,
    row_number() over (
      partition by attempt_id, question_id
      order by ctid desc
    ) as rn
  from quiz_answers
)
select *
from ranked
where question_id in (
  select question_id from quiz_answers
  group by attempt_id, question_id
  having count(*) > 1
)
order by attempt_id, question_id, rn;

-- Step 2: Delete every row except the one kept by the ranking above.
with ranked as (
  select
    id,
    row_number() over (
      partition by attempt_id, question_id
      order by ctid desc
    ) as rn
  from quiz_answers
)
delete from quiz_answers
where id in (select id from ranked where rn > 1);

-- Step 3: Prevent this from ever happening again — enforce one row per
-- (attempt_id, question_id) at the database level, independent of app code or
-- RLS. Must be run AFTER step 2, or it will fail while duplicates still exist.
alter table quiz_answers
  add constraint quiz_answers_attempt_question_unique unique (attempt_id, question_id);

-- ============================================
-- AFTER RUNNING: attempts known to be affected as of the diagnostic that led to
-- this script (2026-08-17) — re-check/re-finalize these in the Grade page:
--   ad7a5721-27c0-4867-b494-5aac6d7cd81d  (4 questions, up to 120 duplicate rows)
--   63ddfc1f-0aa6-49ef-8517-b3210af25b71  (3 questions, up to 11 duplicate rows)
--   db172939-4a82-496a-bf02-0906c446e83e  (3 questions, up to 9 duplicate rows)
-- There may be more below the LIMIT 20 used in the original diagnostic — re-run
-- Step 0 above (no limit) to get the full list before deciding you're done.
-- ============================================
