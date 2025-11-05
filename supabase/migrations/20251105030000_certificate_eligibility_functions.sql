-- Functions for certificate eligibility checking and auto-issuance

-- Check if student is eligible for certificate in a subject
create or replace function check_certificate_eligibility(
  p_student_id uuid,
  p_subject_id uuid
)
returns jsonb as $$
declare
  v_lessons_total integer;
  v_lessons_completed integer;
  v_quizzes_total integer;
  v_quizzes_completed integer;
  v_quizzes_graded integer;
  v_final_score numeric;
  v_grade text;
  v_eligible boolean;
  v_result jsonb;
begin
  -- Count total lessons and completed lessons
  select 
    count(distinct l.id)::integer,
    count(distinct case when lp.status = 'completed' then l.id end)::integer
  into v_lessons_total, v_lessons_completed
  from public.lessons l
  left join public.lesson_progress lp on lp.lesson_id = l.id and lp.student_id = p_student_id
  where l.subject_id = p_subject_id;
  
  -- Count total quizzes and completed/graded quizzes
  select 
    count(distinct q.id)::integer,
    count(distinct case when qa.status = 'graded' then q.id end)::integer,
    count(distinct case when qa.status = 'graded' then q.id end)::integer
  into v_quizzes_total, v_quizzes_completed, v_quizzes_graded
  from public.quizzes q
  left join public.quiz_attempts qa on qa.quiz_id = q.id and qa.student_id = p_student_id
  where q.subject_id = p_subject_id;
  
  -- Calculate final score (average of all quiz scores)
  select coalesce(avg(qa.score), 0)
  into v_final_score
  from public.quiz_attempts qa
  join public.quizzes q on q.id = qa.quiz_id
  where q.subject_id = p_subject_id
  and qa.student_id = p_student_id
  and qa.status = 'graded';
  
  -- Calculate grade
  v_grade := calculate_grade(v_final_score);
  
  -- Check eligibility: all lessons completed and all quizzes graded
  v_eligible := (
    v_lessons_total > 0 
    and v_lessons_completed = v_lessons_total
    and v_quizzes_total > 0
    and v_quizzes_graded = v_quizzes_total
  );
  
  -- Build result
  v_result := jsonb_build_object(
    'eligible', v_eligible,
    'lessons_total', v_lessons_total,
    'lessons_completed', v_lessons_completed,
    'quizzes_total', v_quizzes_total,
    'quizzes_graded', v_quizzes_graded,
    'final_score', v_final_score,
    'grade', v_grade
  );
  
  return v_result;
end;
$$ language plpgsql security definer;

-- Auto-issue certificate if student is eligible
create or replace function auto_issue_certificate_if_eligible(
  p_student_id uuid,
  p_subject_id uuid
)
returns uuid as $$
declare
  v_eligibility jsonb;
  v_certificate_id uuid;
  v_teacher_id uuid;
  v_cert_number text;
begin
  -- Check eligibility
  v_eligibility := check_certificate_eligibility(p_student_id, p_subject_id);
  
  -- Only proceed if eligible
  if not (v_eligibility->>'eligible')::boolean then
    return null;
  end if;
  
  -- Check if certificate already exists
  select id into v_certificate_id
  from public.certificates
  where student_id = p_student_id
  and subject_id = p_subject_id;
  
  -- If exists, don't create duplicate
  if v_certificate_id is not null then
    return v_certificate_id;
  end if;
  
  -- Get teacher_id from subject
  select teacher_id into v_teacher_id
  from public.class_subjects
  where id = p_subject_id;
  
  -- Generate certificate number
  v_cert_number := generate_certificate_number();
  
  -- Create certificate with draft status
  insert into public.certificates (
    student_id,
    subject_id,
    teacher_id,
    final_score,
    grade,
    status,
    auto_issued,
    certificate_number,
    completion_date
  ) values (
    p_student_id,
    p_subject_id,
    v_teacher_id,
    (v_eligibility->>'final_score')::numeric,
    v_eligibility->>'grade',
    'draft',
    true,
    v_cert_number,
    current_date
  )
  returning id into v_certificate_id;
  
  return v_certificate_id;
end;
$$ language plpgsql security definer;

-- Trigger function to auto-issue certificate when lesson progress is completed
create or replace function trigger_auto_issue_certificate_on_lesson()
returns trigger as $$
declare
  v_subject_id uuid;
  v_student_id uuid;
begin
  -- Only trigger on status change to 'completed'
  if new.status = 'completed' and (old.status is null or old.status != 'completed') then
    v_student_id := new.student_id;
    
    -- Get subject_id from lesson
    select subject_id into v_subject_id
    from public.lessons
    where id = new.lesson_id;
    
    -- Attempt auto-issue
    if v_subject_id is not null then
      perform auto_issue_certificate_if_eligible(v_student_id, v_subject_id);
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Create trigger on lesson_progress
drop trigger if exists auto_issue_certificate_on_lesson_complete on public.lesson_progress;
create trigger auto_issue_certificate_on_lesson_complete
after insert or update on public.lesson_progress
for each row
when (new.status = 'completed')
execute function trigger_auto_issue_certificate_on_lesson();

-- Trigger function to auto-issue certificate when quiz is graded
create or replace function trigger_auto_issue_certificate_on_quiz()
returns trigger as $$
declare
  v_subject_id uuid;
  v_student_id uuid;
begin
  -- Only trigger on status change to 'graded'
  if new.status = 'graded' and (old.status is null or old.status != 'graded') then
    v_student_id := new.student_id;
    
    -- Get subject_id from quiz
    select subject_id into v_subject_id
    from public.quizzes
    where id = new.quiz_id;
    
    -- Attempt auto-issue
    if v_subject_id is not null then
      perform auto_issue_certificate_if_eligible(v_student_id, v_subject_id);
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Create trigger on quiz_attempts
drop trigger if exists auto_issue_certificate_on_quiz_graded on public.quiz_attempts;
create trigger auto_issue_certificate_on_quiz_graded
after insert or update on public.quiz_attempts
for each row
when (new.status = 'graded')
execute function trigger_auto_issue_certificate_on_quiz();

