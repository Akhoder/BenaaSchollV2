-- Create branding storage bucket (public read)
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- Ensure RLS is enabled on storage.objects
alter table if exists storage.objects enable row level security;

-- Policies on storage.objects for branding bucket
-- Public (anon, authenticated) can read
drop policy if exists branding_public_read on storage.objects;
create policy branding_public_read on storage.objects
for select
to anon, authenticated
using (bucket_id = 'branding');

-- Admins can insert
drop policy if exists branding_admin_insert on storage.objects;
create policy branding_admin_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'branding'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Admins can update
drop policy if exists branding_admin_update on storage.objects;
create policy branding_admin_update on storage.objects
for update to authenticated
using (
  bucket_id = 'branding'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  bucket_id = 'branding'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Admins can delete
drop policy if exists branding_admin_delete on storage.objects;
create policy branding_admin_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'branding'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

