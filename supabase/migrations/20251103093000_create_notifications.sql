-- Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  role_target text check (role_target in ('all','student','teacher','supervisor','admin')),
  title text not null,
  body text,
  type text not null default 'info',
  link_url text,
  read_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx on public.notifications(recipient_id);
create index if not exists notifications_created_idx on public.notifications(created_at);

alter table public.notifications enable row level security;

-- Recipients can read their notifications
drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own
on public.notifications for select
to authenticated
using (
  (recipient_id is not null and recipient_id = auth.uid())
  or (
    recipient_id is null and (
      -- broadcast by role or class; any authenticated can see, we'll filter at app level if needed
      true
    )
  )
);

-- Recipients can update read_at on their notifications
drop policy if exists notifications_update_read_own on public.notifications;
create policy notifications_update_read_own
on public.notifications for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

-- Admin and teachers can insert notifications
drop policy if exists notifications_insert_staff on public.notifications;
create policy notifications_insert_staff
on public.notifications for insert
to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','teacher','supervisor'))
);

-- Admin can manage all
drop policy if exists notifications_admin_all on public.notifications;
create policy notifications_admin_all
on public.notifications for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
