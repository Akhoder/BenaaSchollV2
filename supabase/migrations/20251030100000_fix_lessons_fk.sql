-- Fix lessons.subject_id foreign key to point to class_subjects(id)
-- Previous FK referenced subjects(id), which doesn't match app usage

alter table if exists public.lessons
  drop constraint if exists lessons_subject_id_fkey;

alter table if exists public.lessons
  add constraint lessons_subject_id_fkey
  foreign key (subject_id) references public.class_subjects(id) on delete cascade;

-- Optional: ensure index still exists
create index if not exists lessons_subject_id_idx on public.lessons(subject_id);


