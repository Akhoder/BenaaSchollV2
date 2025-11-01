-- Add INSERT policy for students to enroll themselves in classes
drop policy if exists "students_can_enroll_in_classes" on public.student_enrollments;
create policy "students_can_enroll_in_classes"
on public.student_enrollments for insert
to authenticated
with check (
  student_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
);

-- Add UPDATE policy for students to update their own enrollments (cancel/reactivate)
drop policy if exists "students_can_update_own_enrollments" on public.student_enrollments;
create policy "students_can_update_own_enrollments"
on public.student_enrollments for update
to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid());

