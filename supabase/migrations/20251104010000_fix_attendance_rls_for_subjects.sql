-- Fix RLS policy for attendance_records to allow teachers to manage attendance
-- based on subjects they teach, not just classes they own
-- This migration updates the existing policy before subject_id column is added

-- Update the existing teacher policy to allow based on subjects in the class
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

