-- Add published flag to classes and update enrollment logic

alter table if exists public.classes
  add column if not exists published boolean not null default false;

-- Ensure student_enrollments is properly set up for class enrollment
-- (should already exist, but verify structure)
-- student_enrollments: student_id, class_id, status

-- RLS: Allow authenticated users to read published classes
alter table if exists public.classes enable row level security;

drop policy if exists "classes_select_published" on public.classes;
create policy "classes_select_published"
on public.classes for select
to authenticated
using (
  published = true
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','teacher','supervisor')
  )
);

drop policy if exists "classes_update_admins_teachers" on public.classes;
create policy "classes_update_admins_teachers"
on public.classes for update
to authenticated
using (
  exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher','supervisor')
  )
)
with check (
  exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher','supervisor')
  )
);

-- Function to auto-enroll student in all subjects when enrolling in a class
create or replace function public.auto_enroll_class_subjects()
returns trigger
language plpgsql
security definer
as $$
begin
  -- When a student enrolls in a class (status = 'active'), auto-enroll in all subjects
  if new.status = 'active' and (old.status is null or old.status != 'active') then
    insert into public.subject_enrollments (subject_id, student_id, status)
    select cs.id, new.student_id, 'active'
    from public.class_subjects cs
    where cs.class_id = new.class_id
      and cs.published = true
      and not exists (
        select 1 from public.subject_enrollments se
        where se.subject_id = cs.id and se.student_id = new.student_id
      );
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_auto_enroll_class_subjects on public.student_enrollments;
create trigger trigger_auto_enroll_class_subjects
after insert or update on public.student_enrollments
for each row execute function public.auto_enroll_class_subjects();

