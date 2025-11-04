-- Add subject_id to attendance_records table
-- This allows attendance tracking at the subject level, not just class level

-- Add subject_id column (nullable for backward compatibility)
alter table if exists public.attendance_records
  add column if not exists subject_id uuid references public.class_subjects(id) on delete cascade;

-- Create index for subject_id
create index if not exists attendance_records_subject_id_idx on public.attendance_records(subject_id);

-- Update RLS policies to allow teachers to manage attendance for their subjects
-- First, update the existing teacher policy to allow based on subjects in the class
drop policy if exists attendance_teacher_manage on public.attendance_records;
create policy attendance_teacher_manage
on public.attendance_records
for all
to authenticated
using (
  -- Allow if teacher owns the class (backward compatibility)
  exists (
    select 1 from public.classes c
    where c.id = attendance_records.class_id
      and (c.teacher_id = auth.uid() or c.supervisor_id = auth.uid())
  )
  OR
  -- Allow if teacher teaches any subject in this class
  exists (
    select 1 from public.class_subjects cs
    where cs.class_id = attendance_records.class_id
      and cs.teacher_id = auth.uid()
  )
)
with check (
  -- Allow if teacher owns the class (backward compatibility)
  exists (
    select 1 from public.classes c
    where c.id = attendance_records.class_id
      and (c.teacher_id = auth.uid() or c.supervisor_id = auth.uid())
  )
  OR
  -- Allow if teacher teaches any subject in this class
  exists (
    select 1 from public.class_subjects cs
    where cs.class_id = attendance_records.class_id
      and cs.teacher_id = auth.uid()
  )
);

-- Policy for subject-based attendance (when subject_id column exists)
drop policy if exists attendance_teacher_manage_subjects on public.attendance_records;
create policy attendance_teacher_manage_subjects
on public.attendance_records
for all
to authenticated
using (
  -- Allow if subject_id is set and teacher owns the subject
  (attendance_records.subject_id IS NOT NULL AND
   exists (
     select 1 from public.class_subjects cs
     where cs.id = attendance_records.subject_id
       and cs.teacher_id = auth.uid()
   ))
  OR
  -- Allow if subject_id is NULL but teacher teaches a subject in this class
  (attendance_records.subject_id IS NULL AND
   exists (
     select 1 from public.class_subjects cs
     where cs.class_id = attendance_records.class_id
       and cs.teacher_id = auth.uid()
   ))
)
with check (
  -- Allow if subject_id is set and teacher owns the subject
  (attendance_records.subject_id IS NOT NULL AND
   exists (
     select 1 from public.class_subjects cs
     where cs.id = attendance_records.subject_id
       and cs.teacher_id = auth.uid()
   ))
  OR
  -- Allow if subject_id is NULL but teacher teaches a subject in this class
  (attendance_records.subject_id IS NULL AND
   exists (
     select 1 from public.class_subjects cs
     where cs.class_id = attendance_records.class_id
       and cs.teacher_id = auth.uid()
   ))
);

