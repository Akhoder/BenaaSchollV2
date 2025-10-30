-- Allow admins/teachers/supervisors to update class_subjects (e.g., publish toggle)
alter table if exists public.class_subjects enable row level security;

drop policy if exists "class_subjects_update_admins_teachers" on public.class_subjects;
create policy "class_subjects_update_admins_teachers"
on public.class_subjects for update
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


