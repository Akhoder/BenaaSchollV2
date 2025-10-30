-- Create lessons and lesson_attachments tables
-- Assumptions:
-- - subjects table exists with primary key id (uuid)
-- - profiles table exists with id (uuid) and role (text) in ('admin','teacher','student','supervisor')
-- - auth.users exists (Supabase default)

-- Enable required extension for gen_random_uuid if not enabled at project level
create extension if not exists pgcrypto;

-- Lessons table
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  description text,
  video_url text, -- optional YouTube/Drive/etc
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lessons_subject_id_idx on public.lessons(subject_id);
create index if not exists lessons_created_by_idx on public.lessons(created_by);

-- Updated at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_lessons_updated_at on public.lessons;
create trigger set_lessons_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

-- Attachments table
create table if not exists public.lesson_attachments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  file_url text not null,
  file_name text,
  file_type text not null check (file_type in ('image','pdf','ppt','word')),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create index if not exists lesson_attachments_lesson_id_idx on public.lesson_attachments(lesson_id);
create index if not exists lesson_attachments_created_by_idx on public.lesson_attachments(created_by);

-- RLS
alter table public.lessons enable row level security;
alter table public.lesson_attachments enable row level security;

-- Policies for lessons
-- Allow read for all authenticated users
drop policy if exists "lessons_read_all_authenticated" on public.lessons;
create policy "lessons_read_all_authenticated"
on public.lessons for select
to authenticated
using (true);

-- Allow insert for teachers and admins; created_by must be auth.uid()
drop policy if exists "lessons_insert_teachers_admins" on public.lessons;
create policy "lessons_insert_teachers_admins"
on public.lessons for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin','teacher')
  )
);

-- Allow update for owner (creator) and admins/teachers
drop policy if exists "lessons_update_owner_teachers_admins" on public.lessons;
create policy "lessons_update_owner_teachers_admins"
on public.lessons for update
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin','teacher')
  )
)
with check (
  created_by = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin','teacher')
  )
);

-- Allow delete for owner and admins
drop policy if exists "lessons_delete_owner_admins" on public.lessons;
create policy "lessons_delete_owner_admins"
on public.lessons for delete
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin')
  )
);

-- Policies for lesson_attachments
-- Allow read for all authenticated
drop policy if exists "lesson_attachments_read_all_authenticated" on public.lesson_attachments;
create policy "lesson_attachments_read_all_authenticated"
on public.lesson_attachments for select
to authenticated
using (true);

-- Allow insert for teachers/admins if they created the parent lesson
drop policy if exists "lesson_attachments_insert_match_lesson_creator" on public.lesson_attachments;
create policy "lesson_attachments_insert_match_lesson_creator"
on public.lesson_attachments for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.lessons l
    where l.id = lesson_id
      and (
        l.created_by = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.role in ('admin','teacher')
        )
      )
  )
);

-- Allow delete for owner of attachment or admins
drop policy if exists "lesson_attachments_delete_owner_admins" on public.lesson_attachments;
create policy "lesson_attachments_delete_owner_admins"
on public.lesson_attachments for delete
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);


