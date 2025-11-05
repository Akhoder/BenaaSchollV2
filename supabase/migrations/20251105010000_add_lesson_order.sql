-- Add order_index column to lessons table for drag-and-drop reordering
-- order_index determines the display order of lessons within a subject

-- Add order_index column with default value based on creation order
alter table public.lessons
  add column if not exists order_index integer;

-- Set initial order_index based on created_at (oldest first)
update public.lessons
set order_index = sub.row_num
from (
  select id, row_number() over (partition by subject_id order by created_at) as row_num
  from public.lessons
) sub
where lessons.id = sub.id;

-- Make order_index NOT NULL after setting values
alter table public.lessons
  alter column order_index set not null;

-- Create index for efficient ordering queries
create index if not exists lessons_order_index_idx on public.lessons(subject_id, order_index);

