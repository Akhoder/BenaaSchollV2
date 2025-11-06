-- Fix public_verify_certificate by dropping old signature and recreating with verification_code

drop function if exists public_verify_certificate(text);

create or replace function public_verify_certificate(
  p_verification_code text
)
returns jsonb as $$
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
$$ language plpgsql security invoker;

grant execute on function public_verify_certificate(text) to anon, authenticated;
