-- Ensure profiles has a policy to allow users to read their own row
alter table if exists public.profiles enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
on public.profiles for select to authenticated
using (id = auth.uid());


