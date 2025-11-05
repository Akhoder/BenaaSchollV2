-- Add auto_publish_certificates column to class_subjects table
-- This allows teachers/admins to enable automatic certificate publishing
-- When enabled, certificates will be published (visible to student) immediately after completion
-- When disabled, certificates will be created as draft and need manual approval

alter table if exists public.class_subjects
  add column if not exists auto_publish_certificates boolean not null default false;

-- Add comment for clarity
comment on column public.class_subjects.auto_publish_certificates is 'If true, certificates will be published automatically when student completes all lessons and quizzes. If false, certificates will be created as draft and need manual approval.';

-- Update the auto_issue_certificate_if_eligible function to check this setting
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
  v_auto_publish boolean;
  v_status text;
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
  
  -- Determine status based on auto_publish setting
  if v_auto_publish then
    v_status := 'published';
  else
    v_status := 'draft';
  end if;
  
  -- Generate certificate number
  v_cert_number := generate_certificate_number();
  
  -- Create certificate with appropriate status
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
    v_status,
    true,
    v_cert_number,
    current_date,
    v_teacher_id, -- Use teacher_id as issued_by for auto-issued certificates
    current_timestamp,
    case when v_status = 'published' then current_timestamp else null end
  )
  returning id into v_certificate_id;
  
  return v_certificate_id;
end;
$$ language plpgsql security definer;

