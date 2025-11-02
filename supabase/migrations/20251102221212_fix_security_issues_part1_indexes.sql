/*
  # Security Fix Part 1: Missing Foreign Key Indexes

  ## Changes
  
  ### 1. Add Missing Foreign Key Indexes
  - `announcements.author_id` - Index for faster author lookups
  - `assignment_submissions.graded_by` - Index for grading queries
  - `schedule_events.created_by` - Index for creator-based filtering
  
  These indexes improve query performance when filtering by foreign keys.

  ### 2. Remove Unused Indexes
  Removes 20 unused indexes that are not being utilized:
  - Schedule events indexes (mode, recur_end, class, teacher)
  - Classes indexes (supervisor_id, level, active)
  - Class subjects indexes (teacher_id)
  - Lessons indexes (created_by)
  - Assignments indexes (due_date, created_by, status)
  - Submissions indexes (assignment_id, student_id, status, student_profile)
  - Lesson progress indexes (student_id, lesson_id, status)
  - Lesson attachments indexes (created_by)

  ## Performance Impact
  - ✅ Improves foreign key query performance
  - ✅ Reduces index maintenance overhead
  - ✅ Decreases database size
*/

-- =====================================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- Index for announcements.author_id foreign key
CREATE INDEX IF NOT EXISTS idx_announcements_author_id 
ON public.announcements(author_id);

-- Index for assignment_submissions.graded_by foreign key
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_graded_by 
ON public.assignment_submissions(graded_by);

-- Index for schedule_events.created_by foreign key
CREATE INDEX IF NOT EXISTS idx_schedule_events_created_by 
ON public.schedule_events(created_by);

-- =====================================================
-- PART 2: REMOVE UNUSED INDEXES
-- =====================================================

-- Schedule events unused indexes
DROP INDEX IF EXISTS public.idx_schedule_events_mode;
DROP INDEX IF EXISTS public.idx_schedule_events_recur_end;
DROP INDEX IF EXISTS public.idx_schedule_events_class;
DROP INDEX IF EXISTS public.idx_schedule_events_teacher;

-- Classes unused indexes
DROP INDEX IF EXISTS public.idx_classes_supervisor_id;
DROP INDEX IF EXISTS public.idx_classes_level;
DROP INDEX IF EXISTS public.idx_classes_active;

-- Class subjects unused indexes
DROP INDEX IF EXISTS public.idx_class_subjects_teacher_id;

-- Lessons unused indexes
DROP INDEX IF EXISTS public.lessons_created_by_idx;

-- Lesson attachments unused indexes
DROP INDEX IF EXISTS public.lesson_attachments_created_by_idx;

-- Assignments unused indexes
DROP INDEX IF EXISTS public.idx_assignments_due_date;
DROP INDEX IF EXISTS public.idx_assignments_created_by;
DROP INDEX IF EXISTS public.idx_assignments_status;

-- Assignment submissions unused indexes
DROP INDEX IF EXISTS public.idx_submissions_assignment_id;
DROP INDEX IF EXISTS public.idx_submissions_student_id;
DROP INDEX IF EXISTS public.idx_submissions_status;
DROP INDEX IF EXISTS public.idx_submissions_student_profile;

-- Lesson progress unused indexes
DROP INDEX IF EXISTS public.idx_lesson_progress_student_id;
DROP INDEX IF EXISTS public.idx_lesson_progress_lesson_id;
DROP INDEX IF EXISTS public.idx_lesson_progress_status;
