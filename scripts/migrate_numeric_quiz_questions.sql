-- ============================================
-- Migrate existing numeric quiz questions to the fixed storage format
-- ============================================
--
-- PROBLEM: Numeric questions used to store the CORRECT ANSWER in
-- quiz_questions.media_url and never created a quiz_options row for them. Every
-- grading code path, however, reads the correct value from a quiz_options row
-- (is_correct = true) and treats media_url as the TOLERANCE — exactly like
-- true_false questions store their answer. Because no such option row existed,
-- numeric answers were always graded as incorrect, for every quiz that has ever
-- existed in this database.
--
-- The application code has been fixed to read/write numeric questions in the
-- correct shape going forward. This script is a ONE-TIME migration for numeric
-- questions that were created before that fix: it moves the value currently
-- sitting in media_url into a quiz_options row, then resets media_url to '0'
-- (an exact-match tolerance). There is no way to recover a "real" historical
-- tolerance — it was never captured before. Teachers should review affected
-- questions afterward and loosen the tolerance if needed.
--
-- HOW TO RUN:
-- 1. Take a database backup / snapshot first — this statement mutates existing
--    quiz content.
-- 2. Open Supabase Dashboard → SQL Editor.
-- 3. Run the SELECT preview below FIRST and sanity-check the row count / values.
-- 4. Only then run the two mutating statements (insert, then update).
--
-- ============================================

-- Step 0: Preview — numeric questions that will be affected (run this first).
select
  q.id as question_id,
  q.quiz_id,
  q.text,
  q.media_url as current_media_url_will_become_correct_answer_text,
  (select count(*) from quiz_options o where o.question_id = q.id) as existing_option_count
from quiz_questions q
where q.type = 'numeric'
  and q.media_url is not null
  and not exists (select 1 from quiz_options o where o.question_id = q.id);

-- Step 1: Insert a quiz_options row carrying the old correct value for every
-- numeric question that doesn't already have one.
insert into quiz_options (question_id, text, is_correct, order_index)
select q.id, q.media_url, true, 0
from quiz_questions q
where q.type = 'numeric'
  and q.media_url is not null
  and not exists (select 1 from quiz_options o where o.question_id = q.id);

-- Step 2: Reset media_url to a default tolerance of 0 (exact match) now that the
-- correct value lives in quiz_options. Only touches rows just migrated above.
update quiz_questions q
set media_url = '0'
where q.type = 'numeric'
  and q.media_url is not null
  and exists (
    select 1 from quiz_options o
    where o.question_id = q.id and o.is_correct = true
  );
