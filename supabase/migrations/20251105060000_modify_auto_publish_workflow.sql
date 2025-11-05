-- Modify auto-publish workflow:
-- Instead of auto-creating published certificates, we'll:
-- 1. Create draft certificates when student completes (if auto_publish is disabled)
-- 2. Just notify student when eligible (if auto_publish is enabled) - student can issue it themselves
-- 3. Update the function to check eligibility and create appropriate status

-- Update the auto_issue_certificate_if_eligible function
create or replace function auto_issue_certificate_if_eligible(
  p_student_id uuid,
  p_subject_id uuid
)
returns uuid as $$
declare
  v_eligibility jsonb;
  v_certificate_id uuid;
  v_teacher_id uuid;
  v_auto_publish boolean;
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
  
  -- Get teacher_id and auto_publish setting from subject
  select teacher_id, coalesce(auto_publish_certificates, false)
  into v_teacher_id, v_auto_publish
  from public.class_subjects
  where id = p_subject_id;
  
  -- If auto_publish is enabled, don't create certificate yet
  -- Just return null - the notification trigger will handle the notification
  -- The student will issue it themselves by clicking a button
  if v_auto_publish then
    return null;
  end if;
  
  -- If auto_publish is disabled, create draft certificate (existing behavior)
  declare
    v_cert_number text;
  begin
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
end;
$$ language plpgsql security definer;

-- Create function to notify student when eligible for certificate (if auto_publish is enabled)
create or replace function notify_certificate_eligible()
returns trigger as $$
declare
  v_subject_id uuid;
  v_student_id uuid;
  v_auto_publish boolean;
  v_subject_name text;
  v_eligibility jsonb;
  v_notification_exists boolean;
begin
  -- Get subject_id from lesson or quiz
  if tg_table_name = 'lesson_progress' then
    select subject_id into v_subject_id
    from public.lessons
    where id = new.lesson_id;
    v_student_id := new.student_id;
  elsif tg_table_name = 'quiz_attempts' then
    select subject_id into v_subject_id
    from public.quizzes
    where id = new.quiz_id;
    v_student_id := new.student_id;
  else
    return new;
  end if;
  
  if v_subject_id is null then
    return new;
  end if;
  
  -- Check if auto_publish is enabled
  select auto_publish_certificates, subject_name
  into v_auto_publish, v_subject_name
  from public.class_subjects
  where id = v_subject_id;
  
  -- Only proceed if auto_publish is enabled
  if not coalesce(v_auto_publish, false) then
    return new;
  end if;
  
  -- Check if certificate already exists
  if exists (
    select 1 from public.certificates
    where student_id = v_student_id
    and subject_id = v_subject_id
  ) then
    return new; -- Certificate already exists, no need to notify
  end if;
  
  -- Check eligibility
  v_eligibility := check_certificate_eligibility(v_student_id, v_subject_id);
  
  -- Only create notification if eligible
  if (v_eligibility->>'eligible')::boolean then
    -- Check if notification already exists (avoid duplicates)
    select exists (
      select 1 from public.notifications
      where recipient_id = v_student_id
      and type = 'certificate_eligible'
      and body like '%' || coalesce(v_subject_name, '') || '%'
      and read_at is null
    ) into v_notification_exists;
    
    if not v_notification_exists then
      -- Create notification
      insert into public.notifications (
        recipient_id,
        title,
        body,
        type,
        link_url
      ) values (
        v_student_id,
        'شهادة جاهزة للإصدار',
        'أنت مؤهل الآن للحصول على شهادة إتمام في مادة ' || coalesce(v_subject_name, '') || '. اضغط لإصدار شهادتك.',
        'certificate_eligible',
        '/dashboard/my-certificates'
      );
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for lesson progress
drop trigger if exists notify_certificate_eligible_on_lesson on public.lesson_progress;
create trigger notify_certificate_eligible_on_lesson
after insert or update on public.lesson_progress
for each row
when (new.status = 'completed')
execute function notify_certificate_eligible();

-- Create trigger for quiz attempts
drop trigger if exists notify_certificate_eligible_on_quiz on public.quiz_attempts;
create trigger notify_certificate_eligible_on_quiz
after insert or update on public.quiz_attempts
for each row
when (new.status = 'graded')
execute function notify_certificate_eligible();

