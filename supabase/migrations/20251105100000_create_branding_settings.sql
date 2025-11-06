-- Branding settings (one row)
create table if not exists public.branding_settings (
  id smallint primary key default 1,
  template text not null default 'classic', -- 'classic' | 'modern'
  logo_url text,
  signature_url text,
  stamp_url text,
  updated_at timestamptz not null default now()
);

-- Ensure single row
insert into public.branding_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.branding_settings enable row level security;

-- Allow anyone authenticated to read branding
create policy branding_select_all on public.branding_settings
for select to authenticated, anon
using (true);

-- Only admins can update
create policy branding_update_admin on public.branding_settings
for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

