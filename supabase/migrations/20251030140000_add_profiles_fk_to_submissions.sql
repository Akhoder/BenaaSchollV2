-- Add explicit foreign key from assignment_submissions to profiles

-- Drop and recreate the foreign key if needed
alter table if exists public.assignment_submissions
  drop constraint if exists assignment_submissions_student_id_profiles_fkey;

-- Add foreign key to profiles table (for easy joins)
alter table if exists public.assignment_submissions
  add constraint assignment_submissions_student_id_profiles_fkey
  foreign key (student_id) references public.profiles(id) on delete cascade;

-- Ensure this index exists for performance
create index if not exists idx_submissions_student_profile on assignment_submissions(student_id) where student_id is not null;

