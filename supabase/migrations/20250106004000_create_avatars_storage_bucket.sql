-- Create avatars storage bucket (public read)
-- Note: RLS is already enabled on storage.objects by Supabase
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policies on storage.objects for avatars bucket
-- Public (anon, authenticated) can read
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
for select
to anon, authenticated
using (bucket_id = 'avatars');

-- Authenticated users can upload their own avatar
drop policy if exists avatars_user_insert on storage.objects;
create policy avatars_user_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can upload any avatar
drop policy if exists avatars_admin_insert on storage.objects;
create policy avatars_admin_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Users can update their own avatar
drop policy if exists avatars_user_update on storage.objects;
create policy avatars_user_update on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can update any avatar
drop policy if exists avatars_admin_update on storage.objects;
create policy avatars_admin_update on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  bucket_id = 'avatars'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Users can delete their own avatar
drop policy if exists avatars_user_delete on storage.objects;
create policy avatars_user_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can delete any avatar
drop policy if exists avatars_admin_delete on storage.objects;
create policy avatars_admin_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatars'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

