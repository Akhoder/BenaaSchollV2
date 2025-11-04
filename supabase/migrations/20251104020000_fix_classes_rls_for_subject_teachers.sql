-- Fix RLS policy for classes to allow teachers to view classes where they teach subjects
-- This allows teachers to see class names even if they don't own the class directly

-- Add policy for teachers to view classes where they teach subjects
drop policy if exists "classes_teacher_view_subjects" on public.classes;
create policy "classes_teacher_view_subjects"
on public.classes for select
to authenticated
using (
  -- Allow if teacher owns the class (existing policy)
  teacher_id = (select auth.uid())
  OR
  -- Allow if teacher teaches any subject in this class
  exists (
    select 1 from public.class_subjects cs
    where cs.class_id = classes.id
      and cs.teacher_id = (select auth.uid())
  )
  OR
  -- Allow if user is admin
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
  OR
  -- Allow if user is supervisor for this class
  supervisor_id = (select auth.uid())
);

