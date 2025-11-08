create or replace function public_verify_certificate(
  p_code text
)
returns table (
  certificate_number text,
  status text,
  subject_name text,
  student_name text,
  published_at timestamptz
) as $$
begin
  return query
  select
    c.certificate_number,
    c.status,
    cs.subject_name,
    coalesce(sp.full_name, '') as student_name,
    c.published_at
  from public.certificates c
  join public.class_subjects cs on cs.id = c.subject_id
  left join public.profiles sp on sp.id = c.student_id
  where c.verification_code = p_code
    and c.status = 'published'
  limit 1;
end;
$$ language plpgsql security definer;

grant execute on function public_verify_certificate(text) to anon, authenticated;

