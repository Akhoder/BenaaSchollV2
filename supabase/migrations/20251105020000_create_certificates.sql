-- Create certificates table for student subject completion certificates
-- Certificates can be auto-issued when eligible or manually issued by teacher/admin
-- Status: draft (auto-created, not visible), issued (approved by staff), published (visible to student)

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.class_subjects(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  
  -- Scores and grade
  final_score numeric not null check (final_score >= 0 and final_score <= 100),
  grade text not null check (grade in ('A', 'B', 'C', 'D', 'F', 'ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'راسب')),
  
  -- Status and issuance
  status text not null default 'draft' check (status in ('draft', 'issued', 'published')),
  auto_issued boolean not null default false,
  
  -- Certificate details
  certificate_number text unique,
  completion_date date not null default current_date,
  
  -- Issuance tracking
  issued_by uuid references public.profiles(id) on delete set null,
  issued_at timestamptz,
  published_at timestamptz,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Ensure one certificate per student-subject
  unique(student_id, subject_id)
);

-- Indexes
create index if not exists certificates_student_idx on public.certificates(student_id);
create index if not exists certificates_subject_idx on public.certificates(subject_id);
create index if not exists certificates_teacher_idx on public.certificates(teacher_id);
create index if not exists certificates_status_idx on public.certificates(status);
create index if not exists certificates_certificate_number_idx on public.certificates(certificate_number);

-- Updated at trigger
create or replace function update_certificates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_certificates_updated_at on public.certificates;
create trigger set_certificates_updated_at
before update on public.certificates
for each row execute function update_certificates_updated_at();

-- Generate certificate number
create or replace function generate_certificate_number()
returns text as $$
declare
  year_part text;
  seq_part text;
  new_number text;
begin
  year_part := to_char(current_date, 'YYYY');
  -- Get next sequence for this year
  select coalesce(max(cast(substring(certificate_number from '\d+$') as integer)), 0) + 1
  into seq_part
  from public.certificates
  where certificate_number ~ ('^CERT-' || year_part || '-');
  
  new_number := 'CERT-' || year_part || '-' || lpad(seq_part::text, 6, '0');
  return new_number;
end;
$$ language plpgsql;

-- Calculate grade from score
create or replace function calculate_grade(score numeric)
returns text as $$
begin
  if score >= 90 then return 'ممتاز';
  elsif score >= 80 then return 'جيد جداً';
  elsif score >= 70 then return 'جيد';
  elsif score >= 60 then return 'مقبول';
  else return 'راسب';
  end if;
end;
$$ language plpgsql;

-- Enable RLS
alter table public.certificates enable row level security;

-- Policies
-- Students can view their own published certificates
drop policy if exists certificates_student_view_published on public.certificates;
create policy certificates_student_view_published
on public.certificates for select
to authenticated
using (
  student_id = auth.uid() and status = 'published'
);

-- Staff (admin, teacher, supervisor) can view all certificates
drop policy if exists certificates_staff_view_all on public.certificates;
create policy certificates_staff_view_all
on public.certificates for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'teacher', 'supervisor')
  )
);

-- Teachers can manage certificates for their subjects
drop policy if exists certificates_teacher_manage on public.certificates;
create policy certificates_teacher_manage
on public.certificates for all
to authenticated
using (
  exists (
    select 1 from public.class_subjects cs
    join public.profiles p on p.id = auth.uid()
    where cs.id = certificates.subject_id
    and (cs.teacher_id = auth.uid() or p.role in ('admin', 'supervisor'))
  )
)
with check (
  exists (
    select 1 from public.class_subjects cs
    join public.profiles p on p.id = auth.uid()
    where cs.id = certificates.subject_id
    and (cs.teacher_id = auth.uid() or p.role in ('admin', 'supervisor'))
  )
);

-- Admins can manage all certificates
drop policy if exists certificates_admin_manage on public.certificates;
create policy certificates_admin_manage
on public.certificates for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role = 'admin'
  )
);

