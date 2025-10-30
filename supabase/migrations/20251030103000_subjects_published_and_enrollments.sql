-- Add published flag to class_subjects and create subject_enrollments

alter table if exists public.class_subjects
  add column if not exists published boolean not null default false;

create table if not exists public.subject_enrollments (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.class_subjects(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','cancelled')),
  created_at timestamptz not null default now(),
  unique (subject_id, student_id)
);

create index if not exists subject_enrollments_subject_id_idx on public.subject_enrollments(subject_id);
create index if not exists subject_enrollments_student_id_idx on public.subject_enrollments(student_id);

alter table public.subject_enrollments enable row level security;

-- Policies
-- Read: authenticated can read their own enrollments; admins/teachers/supervisors can read all
drop policy if exists "subject_enrollments_read" on public.subject_enrollments;
create policy "subject_enrollments_read"
on public.subject_enrollments for select to authenticated
using (
  student_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher','supervisor')
  )
);

-- Insert: students enroll themselves only
drop policy if exists "subject_enrollments_insert_student" on public.subject_enrollments;
create policy "subject_enrollments_insert_student"
on public.subject_enrollments for insert to authenticated
with check (
  student_id = auth.uid() and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'student'
  )
);

-- Update: allow student to cancel their enrollment; admins can update
drop policy if exists "subject_enrollments_update_student_admin" on public.subject_enrollments;
create policy "subject_enrollments_update_student_admin"
on public.subject_enrollments for update to authenticated
using (
  student_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  student_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

-- Delete: allow admin only
drop policy if exists "subject_enrollments_delete_admin" on public.subject_enrollments;
create policy "subject_enrollments_delete_admin"
on public.subject_enrollments for delete to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);


