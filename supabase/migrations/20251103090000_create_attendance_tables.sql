-- Create attendance records table
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  attendance_date date not null default (now() at time zone 'utc')::date,
  status text not null check (status in ('present','absent','late','excused')),
  notes text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists attendance_records_student_id_idx on public.attendance_records(student_id);
create index if not exists attendance_records_class_id_idx on public.attendance_records(class_id);
create index if not exists attendance_records_date_idx on public.attendance_records(attendance_date);

-- Enable RLS
alter table public.attendance_records enable row level security;

-- Policies
-- Admin can do anything
drop policy if exists attendance_admin_all on public.attendance_records;
create policy attendance_admin_all
on public.attendance_records
for all
to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Teachers: can manage attendance for their classes
drop policy if exists attendance_teacher_manage on public.attendance_records;
create policy attendance_teacher_manage
on public.attendance_records
for all
to authenticated
using (
  exists (
    select 1 from public.classes c
    where c.id = attendance_records.class_id
      and (c.teacher_id = auth.uid() or c.supervisor_id = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.classes c
    where c.id = attendance_records.class_id
      and (c.teacher_id = auth.uid() or c.supervisor_id = auth.uid())
  )
);

-- Students: can select own attendance only
drop policy if exists attendance_student_read_own on public.attendance_records;
create policy attendance_student_read_own
on public.attendance_records
for select
to authenticated
using (student_id = auth.uid());

-- Optional helper view for fast stats (not required but useful)
-- create or replace view public.attendance_stats as
-- select student_id,
--        count(*) filter (where status in ('present','late','excused')) as attended,
--        count(*) filter (where status in ('present','absent','late','excused')) as total,
--        (case when count(*) filter (where status in ('present','absent','late','excused')) > 0
--              then round(100.0 * (count(*) filter (where status in ('present','late','excused'))) /
--                           (count(*) filter (where status in ('present','absent','late','excused'))), 0)
--              else 0 end) as attendance_rate
-- from attendance_records
-- group by student_id;
