-- ============================================
-- Harden RLS on quiz grading tables (quiz_answers, quiz_attempts)
-- ============================================
--
-- CONTEXT: This replaces the previous generic draft of this script with concrete
-- statements matched against your actual current policies (captured via
-- `select * from pg_policies where tablename in ('quiz_answers','quiz_attempts')`
-- on 2026-08-17):
--
--   quiz_answers_staff_update   UPDATE  staff role only                         (keep as-is)
--   quiz_answers_student_read_own SELECT own attempt's answers, or staff        (keep as-is)
--   quiz_answers_student_write  INSERT  own attempt only                        (keep as-is)
--   quiz_attempts_student_rw    ALL     student_id = auth.uid() OR staff role   (REPLACED below)
--
-- TWO real problems this fixes, not just a "recommended hardening":
--
-- 1. FUNCTIONAL BUG: there is no DELETE policy on quiz_answers at all (for
--    anyone). saveQuizAnswer() used to delete-then-insert on every answer save,
--    including the periodic 12s autosave. With no DELETE policy, that delete
--    silently affects 0 rows (Postgres RLS default-denies a command with zero
--    applicable policies, without raising an error) and a fresh row gets
--    inserted every time — duplicate quiz_answers rows accumulate per question,
--    and grading sums every row it finds, inflating scores. The app code has
--    been changed to update-if-exists/insert-otherwise instead of delete+insert,
--    but that update needs a policy to actually take effect — added below.
--
-- 2. SECURITY GAP: quiz_attempts_student_rw is `FOR ALL`, so a student can
--    UPDATE any column on their own quiz_attempts row directly via the Supabase
--    client — including `score` and `status`. The new server-side submit route
--    (service role) is a good path that exists alongside this, not a
--    replacement for it. Narrowed below to SELECT + INSERT only for students;
--    UPDATE stays staff-only (matches how the app actually uses this table now
--    that submission/grading runs server-side).
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste and run. Review the
-- BEFORE RUNNING checklist at the bottom first.
-- ============================================

-- ---- quiz_answers: allow students to update ONLY their own in-progress
-- ---- attempt's answers (answer_payload), which saveQuizAnswer now needs.
drop policy if exists "quiz_answers_student_update_own" on quiz_answers;
create policy "quiz_answers_student_update_own"
on quiz_answers for update
using (
  exists (
    select 1 from quiz_attempts a
    where a.id = quiz_answers.attempt_id
      and a.student_id = auth.uid()
      and a.status = 'in_progress'
  )
)
with check (
  exists (
    select 1 from quiz_attempts a
    where a.id = quiz_answers.attempt_id
      and a.student_id = auth.uid()
      and a.status = 'in_progress'
  )
);

-- Postgres RLS cannot restrict which *columns* an UPDATE touches, so the policy
-- above alone would let a student set is_correct/points_awarded on their own
-- answer too (as long as the row/attempt still qualifies). Close that with a
-- trigger: any change to the grading columns is rejected unless it comes from
-- the service role (the submit-attempt API route) or a staff profile (the
-- grading UI, which already goes through quiz_answers_staff_update).
create or replace function reject_student_grade_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.is_correct is distinct from old.is_correct
      or new.points_awarded is distinct from old.points_awarded
      or new.graded_at is distinct from old.graded_at)
     and auth.role() <> 'service_role'
     and not exists (
       select 1 from profiles p
       where p.id = auth.uid() and p.role in ('admin', 'teacher', 'supervisor')
     )
  then
    raise exception 'grading fields are read-only for this session';
  end if;
  return new;
end;
$$;

drop trigger if exists quiz_answers_reject_student_grade_write on quiz_answers;
create trigger quiz_answers_reject_student_grade_write
before update on quiz_answers
for each row execute function reject_student_grade_write();

-- ---- quiz_attempts: split the current FOR ALL policy so students keep
-- ---- read/insert (needed to view their attempts and call startQuizAttempt),
-- ---- but lose the ability to UPDATE score/status directly. Staff keep update
-- ---- (GradeQuizClient's finalizeAttempt writes status directly as a signed-in
-- ---- teacher/admin) and the service-role route bypasses RLS entirely either way.
drop policy if exists "quiz_attempts_student_rw" on quiz_attempts;

create policy "quiz_attempts_select"
on quiz_attempts for select
using (
  student_id = auth.uid()
  or exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('admin', 'teacher', 'supervisor')
  )
);

create policy "quiz_attempts_student_insert"
on quiz_attempts for insert
with check (student_id = auth.uid());

create policy "quiz_attempts_staff_update"
on quiz_attempts for update
using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('admin', 'teacher', 'supervisor')
  )
)
with check (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('admin', 'teacher', 'supervisor')
  )
);

-- ============================================
-- BEFORE RUNNING — checklist
-- ============================================
-- [ ] Confirm no other code path relies on a student directly UPDATE-ing their
--     own quiz_attempts row (grep the app for `.from('quiz_attempts').update`
--     outside of staff-gated pages and the service-role API route — as of this
--     script there is none; the take-quiz page only INSERTs via
--     startQuizAttempt and submits through /api/quizzes/submit-attempt).
-- [ ] Run the two diagnostic queries below FIRST and share the results before
--     deciding whether a data-cleanup pass is also needed for attempts that
--     already accumulated duplicate quiz_answers rows under the old delete-then-
--     insert code path:
--
--     -- does quiz_answers have a unique constraint on (attempt_id, question_id)?
--     select conname, pg_get_constraintdef(oid)
--     from pg_constraint
--     where conrelid = 'quiz_answers'::regclass;
--
--     -- how many (attempt_id, question_id) pairs currently have duplicate rows?
--     select attempt_id, question_id, count(*)
--     from quiz_answers
--     group by attempt_id, question_id
--     having count(*) > 1
--     order by count(*) desc
--     limit 20;
-- ============================================
