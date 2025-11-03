-- Quizzes core schema
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.class_subjects(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  description text,
  time_limit_minutes integer check (time_limit_minutes > 0),
  start_at timestamptz,
  end_at timestamptz,
  attempts_allowed integer not null default 1 check (attempts_allowed >= 1),
  shuffle_questions boolean not null default true,
  shuffle_options boolean not null default true,
  show_results_policy text not null default 'after_close' check (show_results_policy in ('immediate','after_close','never')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists quizzes_subject_idx on public.quizzes(subject_id);
create index if not exists quizzes_lesson_idx on public.quizzes(lesson_id);
create index if not exists quizzes_start_end_idx on public.quizzes(start_at, end_at);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  type text not null check (type in ('mcq_single','mcq_multi','true_false','short_text','numeric','ordering','matching')),
  text text not null,
  media_url text,
  points numeric not null default 1 check (points >= 0),
  order_index integer not null default 0
);

create index if not exists quiz_questions_quiz_idx on public.quiz_questions(quiz_id);

create table if not exists public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  text text not null,
  is_correct boolean not null default false,
  order_index integer not null default 0
);

create index if not exists quiz_options_question_idx on public.quiz_options(question_id);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  attempt_number integer not null default 1,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  duration_seconds integer,
  score numeric,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','graded'))
);

create index if not exists quiz_attempts_quiz_idx on public.quiz_attempts(quiz_id);
create index if not exists quiz_attempts_student_idx on public.quiz_attempts(student_id);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  answer_payload jsonb not null,
  is_correct boolean,
  points_awarded numeric,
  graded_at timestamptz
);

create index if not exists quiz_answers_attempt_idx on public.quiz_answers(attempt_id);
create index if not exists quiz_answers_question_idx on public.quiz_answers(question_id);

-- Enable RLS
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;

-- Helper predicate: is staff (admin/teacher/supervisor)
-- We will inline profile role checks in policies

-- Quizzes policies
-- Staff can manage quizzes
drop policy if exists quizzes_manage_staff on public.quizzes;
create policy quizzes_manage_staff
on public.quizzes for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher','supervisor')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher','supervisor')));

-- Students can select quizzes (filtering by window handled at app; can refine later)
drop policy if exists quizzes_select_authenticated on public.quizzes;
create policy quizzes_select_authenticated
on public.quizzes for select
to authenticated
using (true);

-- Questions
drop policy if exists quiz_questions_manage_staff on public.quiz_questions;
create policy quiz_questions_manage_staff
on public.quiz_questions for all
to authenticated
using (exists (select 1 from public.quizzes q join public.profiles p on p.id = auth.uid() where q.id = quiz_questions.quiz_id and p.role in ('admin','teacher','supervisor')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher','supervisor')));

drop policy if exists quiz_questions_select_authenticated on public.quiz_questions;
create policy quiz_questions_select_authenticated
on public.quiz_questions for select
to authenticated
using (true);

-- Options
drop policy if exists quiz_options_manage_staff on public.quiz_options;
create policy quiz_options_manage_staff
on public.quiz_options for all
to authenticated
using (exists (select 1 from public.quiz_questions qq join public.quizzes q on q.id = qq.quiz_id join public.profiles p on p.id = auth.uid() where qq.id = quiz_options.question_id and p.role in ('admin','teacher','supervisor')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher','supervisor')));

drop policy if exists quiz_options_select_authenticated on public.quiz_options;
create policy quiz_options_select_authenticated
on public.quiz_options for select
to authenticated
using (true);

-- Attempts (students manage their own attempts)
drop policy if exists quiz_attempts_student_rw on public.quiz_attempts;
create policy quiz_attempts_student_rw
on public.quiz_attempts for all
to authenticated
using (student_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher','supervisor')))
with check (student_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher','supervisor')));

-- Answers (students write their own; staff can read/grade)
drop policy if exists quiz_answers_student_write on public.quiz_answers;
create policy quiz_answers_student_write
on public.quiz_answers for insert
to authenticated
with check (exists (select 1 from public.quiz_attempts a where a.id = quiz_answers.attempt_id and a.student_id = auth.uid()));

drop policy if exists quiz_answers_student_read_own on public.quiz_answers;
create policy quiz_answers_student_read_own
on public.quiz_answers for select
to authenticated
using (exists (select 1 from public.quiz_attempts a where a.id = quiz_answers.attempt_id and a.student_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher','supervisor')));

-- Staff can update/grade answers
drop policy if exists quiz_answers_staff_update on public.quiz_answers;
create policy quiz_answers_staff_update
on public.quiz_answers for update
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher','supervisor')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher','supervisor')));
