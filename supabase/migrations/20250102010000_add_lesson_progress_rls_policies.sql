/*
  # Add Lesson Progress RLS Policies
  
  Purpose: Add Row Level Security policies for lesson_progress table
  - Only add if policies are missing
  - Safe to run multiple times (uses DROP IF EXISTS)
*/

-- ============================================
-- Enable RLS on lesson_progress
-- ============================================

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for Students
-- ============================================

-- Students can view only their own progress
DROP POLICY IF EXISTS "lesson_progress_select_own" ON lesson_progress;
CREATE POLICY "lesson_progress_select_own"
ON lesson_progress FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Students can insert their own progress
DROP POLICY IF EXISTS "lesson_progress_insert_own" ON lesson_progress;
CREATE POLICY "lesson_progress_insert_own"
ON lesson_progress FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

-- Students can update their own progress
DROP POLICY IF EXISTS "lesson_progress_update_own" ON lesson_progress;
CREATE POLICY "lesson_progress_update_own"
ON lesson_progress FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- ============================================
-- RLS Policies for Teachers/Admins
-- ============================================

-- Teachers can view progress of their students' lessons
DROP POLICY IF EXISTS "lesson_progress_select_teachers" ON lesson_progress;
CREATE POLICY "lesson_progress_select_teachers"
ON lesson_progress FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('teacher', 'admin', 'supervisor')
  )
);

-- Admins have full access
DROP POLICY IF EXISTS "lesson_progress_admin_access" ON lesson_progress;
CREATE POLICY "lesson_progress_admin_access"
ON lesson_progress FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

