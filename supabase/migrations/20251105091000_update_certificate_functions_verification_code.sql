-- Update auto_issue_certificate_if_eligible to set verification_code
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
  v_cert_number text;
  v_code text;
begin
  v_eligibility := check_certificate_eligibility(p_student_id, p_subject_id);
  if not (v_eligibility->>'eligible')::boolean then
    return null;
  end if;
  select id into v_certificate_id from public.certificates
  where student_id = p_student_id and subject_id = p_subject_id;
  if v_certificate_id is not null then
    return v_certificate_id;
  end if;
  select teacher_id, coalesce(auto_publish_certificates, false)
  into v_teacher_id, v_auto_publish
  from public.class_subjects where id = p_subject_id;
  v_cert_number := generate_certificate_number();
  v_code := lower(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));
  insert into public.certificates (
    student_id, subject_id, teacher_id,
    final_score, grade, status, auto_issued,
    certificate_number, verification_code, completion_date,
    issued_by, issued_at, published_at
  ) values (
    p_student_id, p_subject_id, v_teacher_id,
    (v_eligibility->>'final_score')::numeric,
    v_eligibility->>'grade', case when v_auto_publish then 'published' else 'draft' end, true,
    v_cert_number, v_code, current_date,
    v_teacher_id, current_timestamp,
    case when v_auto_publish then current_timestamp else null end
  ) returning id into v_certificate_id;
  return v_certificate_id;
end;
$$ language plpgsql security definer;

-- Update student_issue_certificate to set verification_code
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
  v_code text;
begin
  -- Check eligibility
  v_eligibility := check_certificate_eligibility(p_student_id, p_subject_id);
  if not (v_eligibility->>'eligible')::boolean then
    raise exception 'Not eligible for certificate';
  end if;
  -- If exists update to published
  select id into v_certificate_id from public.certificates
  where student_id = p_student_id and subject_id = p_subject_id;
  if v_certificate_id is not null then
    update public.certificates
    set status = 'published',
        published_at = coalesce(published_at, current_timestamp)
    where id = v_certificate_id;
    return v_certificate_id;
  end if;
  select teacher_id into v_teacher_id from public.class_subjects where id = p_subject_id;
  v_cert_number := generate_certificate_number();
  v_code := lower(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));
  insert into public.certificates (
    student_id, subject_id, teacher_id,
    final_score, grade, status, auto_issued,
    certificate_number, verification_code, completion_date,
    issued_by, issued_at, published_at
  ) values (
    p_student_id, p_subject_id, v_teacher_id,
    (v_eligibility->>'final_score')::numeric,
    v_eligibility->>'grade', 'published', false,
    v_cert_number, v_code, current_date,
    p_student_id, current_timestamp, current_timestamp
  ) returning id into v_certificate_id;
  return v_certificate_id;
end;
$$ language plpgsql security definer;

