-- Create function for students to manually issue their own certificates
-- This is used when auto_publish is enabled and student wants to issue their certificate

create or replace function student_issue_certificate(
  p_student_id uuid,
  p_subject_id uuid
)
returns uuid as $$
declare
  v_eligibility jsonb;
  v_certificate_id uuid;
  v_teacher_id uuid;
  v_cert_number text;
  v_current_user_id uuid;
begin
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  -- Ensure the student is issuing for themselves
  if v_current_user_id is null or v_current_user_id != p_student_id then
    raise exception 'Unauthorized: You can only issue certificates for yourself';
  end if;
  
  -- Check eligibility
  v_eligibility := check_certificate_eligibility(p_student_id, p_subject_id);
  
  -- Only proceed if eligible
  if not (v_eligibility->>'eligible')::boolean then
    raise exception 'Not eligible for certificate. Complete all lessons and quizzes first.';
  end if;
  
  -- Check if certificate already exists
  select id into v_certificate_id
  from public.certificates
  where student_id = p_student_id
  and subject_id = p_subject_id;
  
  -- If exists and already published, return it
  if v_certificate_id is not null then
    update public.certificates
    set status = 'published',
        published_at = coalesce(published_at, current_timestamp),
        updated_at = current_timestamp
    where id = v_certificate_id
    and status != 'published';
    return v_certificate_id;
  end if;
  
  -- If exists but not published, update it
  if v_certificate_id is not null then
    update public.certificates
    set status = 'published',
        published_at = current_timestamp,
        issued_by = p_student_id,
        issued_at = current_timestamp,
        updated_at = current_timestamp
    where id = v_certificate_id;
    return v_certificate_id;
  end if;
  
  -- Get teacher_id from subject
  select teacher_id into v_teacher_id
  from public.class_subjects
  where id = p_subject_id;
  
  -- Generate certificate number
  v_cert_number := generate_certificate_number();
  
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
    false, -- Student is manually issuing, so not auto-issued
    v_cert_number,
    current_date,
    p_student_id, -- Student is issuing it themselves
    current_timestamp,
    current_timestamp
  )
  returning id into v_certificate_id;
  
  return v_certificate_id;
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users
grant execute on function student_issue_certificate(uuid, uuid) to authenticated;

