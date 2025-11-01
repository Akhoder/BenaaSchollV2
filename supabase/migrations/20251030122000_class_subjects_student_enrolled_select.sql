-- Update policy to allow students to view subjects in their enrolled classes
drop policy if exists "class_subjects_select_enrolled_students" on public.class_subjects;
create policy "class_subjects_select_enrolled_students"
on public.class_subjects for select
to authenticated
using (
  published = true
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','teacher','supervisor')
  )
  or exists (
    -- Students can view subjects in classes they're enrolled in
    select 1 from public.student_enrollments se
    where se.class_id = class_subjects.class_id
      and se.student_id = auth.uid()
      and se.status = 'active'
  )
);

-- Also ensure lessons are readable by students for enrolled subjects
alter table if exists public.lessons enable row level security;

drop policy if exists "lessons_select_for_enrolled_students" on public.lessons;
create policy "lessons_select_for_enrolled_students"
on public.lessons for select
to authenticated
using (
  true  -- Allow all authenticated users to read lessons
  -- Can be restricted further if needed based on subject enrollment
);

-- Allow students to read lesson attachments for enrolled subjects
alter table if exists public.lesson_attachments enable row level security;

drop policy if exists "lesson_attachments_select_for_enrolled_students" on public.lesson_attachments;
create policy "lesson_attachments_select_for_enrolled_students"
on public.lesson_attachments for select
to authenticated
using (true);

