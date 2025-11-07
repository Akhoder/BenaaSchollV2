`-- Fix search_path security warnings for all certificate-related functions
-- This prevents search path manipulation attacks

-- Fix update_certificates_updated_at
create or replace function update_certificates_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Fix generate_certificate_number
create or replace function generate_certificate_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_number text;
begin
  v_number := 'CERT-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('certificate_number_seq')::text, 6, '0');
  return v_number;
end;
$$;

-- Fix calculate_grade
create or replace function calculate_grade(score numeric)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if score >= 90 then
    return 'ممتاز';
  elsif score >= 80 then
    return 'جيد جداً';
  elsif score >= 70 then
    return 'جيد';
  elsif score >= 60 then
    return 'مقبول';
  else
    return 'راسب';
  end if;
end;
$$;

-- Fix check_certificate_eligibility
create or replace function check_certificate_eligibility(
  p_student_id uuid,
  p_subject_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lessons_total integer;
  v_lessons_completed integer;
  v_quizzes_total integer;
  v_quizzes_graded integer;
  v_final_score numeric;
  v_grade text;
  v_eligible boolean := false;
begin
  -- Count total lessons for this subject
  select count(*) into v_lessons_total
  from public.lessons
  where subject_id = p_subject_id and status = 'published';

  -- Count completed lessons
  select count(*) into v_lessons_completed
  from public.lesson_progress
  where student_id = p_student_id
    and lesson_id in (select id from public.lessons where subject_id = p_subject_id)
    and completed = true;

  -- Count total quizzes for this subject
  select count(*) into v_quizzes_total
  from public.quizzes
  where subject_id = p_subject_id
    and (end_at is null or end_at > now());

  -- Count graded quizzes (with at least one attempt)
  select count(distinct q.id) into v_quizzes_graded
  from public.quizzes q
  inner join public.quiz_attempts qa on q.id = qa.quiz_id
  where q.subject_id = p_subject_id
    and qa.student_id = p_student_id
    and qa.status = 'completed'
    and (q.end_at is null or q.end_at > now());

  -- Calculate final score (average of quiz scores)
  select coalesce(avg(qa.score), 0) into v_final_score
  from public.quiz_attempts qa
  inner join public.quizzes q on qa.quiz_id = q.id
  where q.subject_id = p_subject_id
    and qa.student_id = p_student_id
    and qa.status = 'completed';

  -- Calculate grade
  v_grade := public.calculate_grade(v_final_score);

  -- Check eligibility: all lessons completed and all quizzes graded
  if v_lessons_total > 0 and v_lessons_completed = v_lessons_total
     and v_quizzes_total > 0 and v_quizzes_graded = v_quizzes_total then
    v_eligible := true;
  end if;

  return jsonb_build_object(
    'eligible', v_eligible,
    'lessons_total', v_lessons_total,
    'lessons_completed', v_lessons_completed,
    'quizzes_total', v_quizzes_total,
    'quizzes_graded', v_quizzes_graded,
    'final_score', v_final_score,
    'grade', v_grade
  );
end;
$$;

-- Fix auto_issue_certificate_if_eligible
create or replace function auto_issue_certificate_if_eligible(
  p_student_id uuid,
  p_subject_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eligibility jsonb;
  v_certificate_id uuid;
  v_teacher_id uuid;
  v_cert_number text;
  v_verification_code text;
begin
  -- Check eligibility
  v_eligibility := public.check_certificate_eligibility(p_student_id, p_subject_id);

  -- Only proceed if eligible
  if not (v_eligibility->>'eligible')::boolean then
    return null;
  end if;

  -- Check if certificate already exists
  select id into v_certificate_id
  from public.certificates
  where student_id = p_student_id
  and subject_id = p_subject_id;

  -- If exists, return existing ID
  if v_certificate_id is not null then
    return v_certificate_id;
  end if;

  -- Get teacher_id from subject
  select teacher_id into v_teacher_id
  from public.class_subjects
  where id = p_subject_id;

  -- Generate certificate number
  v_cert_number := public.generate_certificate_number();

  -- Generate verification code
  v_verification_code := encode(gen_random_bytes(16), 'hex');

  -- Create certificate
  insert into public.certificates (
    student_id,
    subject_id,
    teacher_id,
    final_score,
    grade,
    status,
    auto_issued,
    certificate_number,
    verification_code,
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
    v_verification_code,
    current_date
  )
  returning id into v_certificate_id;

  return v_certificate_id;
end;
$$;

-- Fix student_issue_certificate
create or replace function student_issue_certificate(
  p_student_id uuid,
  p_subject_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eligibility jsonb;
  v_certificate_id uuid;
  v_teacher_id uuid;
  v_cert_number text;
  v_verification_code text;
begin
  -- Ensure the student is authenticated and matches p_student_id
  if auth.uid() is null or auth.uid() != p_student_id then
    raise exception 'Unauthorized: Student ID does not match authenticated user.';
  end if;

  -- Check eligibility
  v_eligibility := public.check_certificate_eligibility(p_student_id, p_subject_id);

  -- Only proceed if eligible
  if not (v_eligibility->>'eligible')::boolean then
    raise exception 'Student is not eligible for a certificate in this subject.';
  end if;

  -- Check if certificate already exists
  select id into v_certificate_id
  from public.certificates
  where student_id = p_student_id
  and subject_id = p_subject_id;

  -- If exists, update status to published; otherwise, create new
  if v_certificate_id is not null then
    -- Generate verification code if not exists
    select verification_code into v_verification_code
    from public.certificates
    where id = v_certificate_id;

    if v_verification_code is null then
      v_verification_code := encode(gen_random_bytes(16), 'hex');
    end if;

    update public.certificates
    set
      status = 'published',
      final_score = (v_eligibility->>'final_score')::numeric,
      grade = v_eligibility->>'grade',
      issued_by = p_student_id,
      issued_at = current_timestamp,
      published_at = current_timestamp,
      updated_at = now(),
      verification_code = v_verification_code
    where id = v_certificate_id
    returning id into v_certificate_id;
  else
    -- Get teacher_id from subject
    select teacher_id into v_teacher_id
    from public.class_subjects
    where id = p_subject_id;

    -- Generate certificate number
    v_cert_number := generate_certificate_number();

    -- Generate verification code
    v_verification_code := encode(gen_random_bytes(16), 'hex');

    -- Create certificate with published status
    insert into public.certificates (
      student_id,
      subject_id,
      teacher_id,
      final_score,
      grade,
      status,
      auto_issued,
      certificate_number,
      verification_code,
      completion_date,
      issued_by,
      issued_at,
      published_at
    ) values (
      p_student_id,
      p_subject_id,
      v_teacher_id,
      (v_eligibility->>'final_score')::numeric,
      v_eligibility->>'grade',
      'published',
      false,
      v_cert_number,
      v_verification_code,
      current_date,
      p_student_id,
      current_timestamp,
      current_timestamp
    )
    returning id into v_certificate_id;
  end if;

  return v_certificate_id;
end;
$$;

-- Fix notify_certificate_published
create or replace function notify_certificate_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_profile record;
  v_subject_name text;
begin
  -- Only notify if status changed to published
  if new.status = 'published' and (old.status is null or old.status != 'published') then
    -- Get student profile
    select * into v_student_profile
    from public.profiles
    where id = new.student_id;

    -- Get subject name
    select subject_name into v_subject_name
    from public.class_subjects
    where id = new.subject_id;

    -- Create notification
    insert into public.notifications (
      user_id,
      type,
      title,
      body,
      link_url
    ) values (
      new.student_id,
      'certificate_published',
      'تم إصدار شهادة جديدة',
      'تم إصدار شهادة إتمام في مادة: ' || v_subject_name,
      '/dashboard/my-certificates'
    );
  end if;

  return new;
end;
$$;

-- Fix notify_certificate_eligible
create or replace function notify_certificate_eligible()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_eligibility jsonb;
  v_subject_name text;
begin
  -- Check if student is now eligible
  v_eligibility := check_certificate_eligibility(new.student_id, new.subject_id);

  if (v_eligibility->>'eligible')::boolean then
    -- Get subject name
    select subject_name into v_subject_name
    from public.class_subjects
    where id = new.subject_id;

    -- Check if notification already exists
    if not exists (
      select 1 from public.notifications
      where user_id = new.student_id
        and type = 'certificate_eligible'
        and link_url like '%/dashboard/my-certificates%'
        and created_at > now() - interval '1 day'
    ) then
      -- Create notification
      insert into public.notifications (
        user_id,
        type,
        title,
        body,
        link_url
      ) values (
        new.student_id,
        'certificate_eligible',
        'أنت مؤهل للحصول على شهادة',
        'أكملت جميع متطلبات الحصول على شهادة في مادة: ' || v_subject_name,
        '/dashboard/my-certificates'
      );
    end if;
  end if;

  return new;
end;
$$;

-- Fix public_verify_certificate
create or replace function public_verify_certificate(p_verification_code text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_cert_data jsonb;
begin
  select jsonb_build_object(
    'certificate_number', c.certificate_number,
    'student_name', p.full_name,
    'subject_name', cs.subject_name,
    'completion_date', c.completion_date,
    'final_score', c.final_score,
    'grade', c.grade,
    'status', c.status,
    'issued_at', c.issued_at,
    'published_at', c.published_at,
    'teacher_name', t.full_name,
    'verification_code', c.verification_code
  )
  into v_cert_data
  from public.certificates c
  join public.profiles p on c.student_id = p.id
  join public.class_subjects cs on c.subject_id = cs.id
  left join public.profiles t on c.teacher_id = t.id
  where c.verification_code = p_verification_code
  and c.status = 'published';

  return v_cert_data;
end;
$$;

-- Fix trigger_auto_issue_certificate_on_lesson
create or replace function trigger_auto_issue_certificate_on_lesson()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject_id uuid;
  v_student_id uuid;
begin
  -- Only process if lesson is completed
  if new.completed = true and (old.completed is null or old.completed = false) then
    v_student_id := new.student_id;
    
    -- Get subject_id from lesson
    select subject_id into v_subject_id
    from public.lessons
    where id = new.lesson_id;

    -- Try to auto-issue certificate if eligible
    perform public.auto_issue_certificate_if_eligible(v_student_id, v_subject_id);
  end if;

  return new;
end;
$$;

-- Fix trigger_auto_issue_certificate_on_quiz
create or replace function trigger_auto_issue_certificate_on_quiz()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject_id uuid;
  v_student_id uuid;
begin
  -- Only process if quiz is completed
  if new.status = 'completed' and (old.status is null or old.status != 'completed') then
    v_student_id := new.student_id;
    
    -- Get subject_id from quiz
    select subject_id into v_subject_id
    from public.quizzes
    where id = new.quiz_id;

    -- Try to auto-issue certificate if eligible
    perform public.auto_issue_certificate_if_eligible(v_student_id, v_subject_id);
  end if;

  return new;
end;
$$;

`