-- Allow authenticated users (including students) to read only published subjects
alter table if exists public.class_subjects enable row level security;

drop policy if exists "class_subjects_select_published" on public.class_subjects;
create policy "class_subjects_select_published"
on public.class_subjects for select
to authenticated
using (
  published = true
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','teacher','supervisor')
  )
);


