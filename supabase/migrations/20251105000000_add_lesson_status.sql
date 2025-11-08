-- Add status and scheduled_at columns to lessons table
-- Status values: 'draft', 'published', 'scheduled'
-- scheduled_at is optional and used when status is 'scheduled'

-- Add status column with default 'draft'
alter table public.lessons
  add column if not exists status text default 'draft' check (status in ('draft', 'published', 'scheduled'));

-- Add scheduled_at column (optional)
alter table public.lessons
  add column if not exists scheduled_at timestamptz;

-- Create index for status filtering
create index if not exists lessons_status_idx on public.lessons(status);

-- Create index for scheduled lessons
create index if not exists lessons_scheduled_at_idx on public.lessons(scheduled_at) where scheduled_at is not null;

-- Update existing lessons to 'published' if they don't have status set
-- (assuming existing lessons are already published)
update public.lessons
set status = 'published'
where status is null or status = 'draft';

