-- Allow teachers and admins to read student profiles for grading purposes

drop policy if exists "profiles_select_for_teachers" on public.profiles;
create policy "profiles_select_for_teachers"
on public.profiles for select to authenticated
using (
  id = auth.uid()  -- Can read own profile
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'teacher', 'supervisor')
  )  -- Admins, teachers, supervisors can read all profiles
);

