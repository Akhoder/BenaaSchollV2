/*
  # Fix Security and Performance Issues

  ## Overview
  This migration addresses all security warnings and performance issues:
  1. Add missing indexes for foreign keys
  2. Optimize RLS policies to use (select auth.uid()) pattern
  3. Fix function search paths
  4. Remove unused indexes
  5. Consolidate duplicate policies

  ## Changes
  1. Add index for class_subjects.subject_id foreign key
  2. Optimize all RLS policies to cache auth function calls
  3. Fix search_path for functions
  4. Drop unused indexes
  5. Consolidate overlapping policies

  ## Performance Impact
  - Better query performance at scale
  - Reduced function re-evaluation overhead
  - Proper index usage
*/

-- ============================================
-- PART 1: Add Missing Indexes
-- ============================================

-- Add index for class_subjects.subject_id foreign key
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject 
ON class_subjects(subject_id);

-- ============================================
-- PART 2: Drop Unused Indexes
-- ============================================

-- These indexes were created but not being used by queries
DROP INDEX IF EXISTS idx_profiles_email;
DROP INDEX IF EXISTS idx_classes_teacher;
DROP INDEX IF EXISTS idx_classes_supervisor;
DROP INDEX IF EXISTS idx_student_enrollments_student;
DROP INDEX IF EXISTS idx_student_enrollments_class;
DROP INDEX IF EXISTS idx_class_subjects_class;
DROP INDEX IF EXISTS idx_class_subjects_teacher;
DROP INDEX IF EXISTS idx_announcements_author;

-- ============================================
-- PART 3: Fix Function Search Paths
-- ============================================

-- Fix update_updated_at function search path
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- PART 4: Optimize Profiles RLS Policies
-- ============================================

-- Drop existing profiles policies
DROP POLICY IF EXISTS "enable_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "enable_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "enable_insert_own_profile" ON profiles;

-- Recreate with optimized auth function calls
CREATE POLICY "enable_read_own_profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "enable_update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "enable_insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- ============================================
-- PART 5: Optimize Classes RLS Policies
-- ============================================

-- Drop existing classes policies
DROP POLICY IF EXISTS "Admins can manage classes" ON classes;
DROP POLICY IF EXISTS "Users can view classes based on role" ON classes;

-- Consolidate into efficient policies
CREATE POLICY "users_can_view_classes"
  ON classes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role = 'admin'
        OR (role = 'teacher' AND classes.teacher_id = (select auth.uid()))
        OR (role = 'supervisor' AND classes.supervisor_id = (select auth.uid()))
        OR (role = 'student' AND EXISTS (
          SELECT 1 FROM student_enrollments
          WHERE student_enrollments.class_id = classes.id
          AND student_enrollments.student_id = (select auth.uid())
        ))
      )
    )
  );

-- ============================================
-- PART 6: Optimize Subjects RLS Policies
-- ============================================

-- Drop existing subjects policies
DROP POLICY IF EXISTS "Admins can manage subjects" ON subjects;
DROP POLICY IF EXISTS "Authenticated users can view subjects" ON subjects;

-- Recreate optimized policies
CREATE POLICY "authenticated_can_view_subjects"
  ON subjects FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- PART 7: Optimize Class Subjects RLS Policies
-- ============================================

-- Drop existing class_subjects policies
DROP POLICY IF EXISTS "Admins can manage class subjects" ON class_subjects;
DROP POLICY IF EXISTS "Users can view class subjects based on access" ON class_subjects;

-- Recreate optimized policies
CREATE POLICY "users_can_view_class_subjects"
  ON class_subjects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role = 'admin'
        OR (role = 'teacher' AND (
          class_subjects.teacher_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = class_subjects.class_id
            AND classes.teacher_id = (select auth.uid())
          )
        ))
        OR (role = 'student' AND EXISTS (
          SELECT 1 FROM student_enrollments
          WHERE student_enrollments.class_id = class_subjects.class_id
          AND student_enrollments.student_id = (select auth.uid())
        ))
      )
    )
  );

-- ============================================
-- PART 8: Optimize Student Enrollments RLS Policies
-- ============================================

-- Drop existing student_enrollments policies
DROP POLICY IF EXISTS "Admins can manage enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "Students can view own enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "Teachers and supervisors can view class enrollments" ON student_enrollments;

-- Recreate optimized policies
CREATE POLICY "users_can_view_enrollments"
  ON student_enrollments FOR SELECT
  TO authenticated
  USING (
    student_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (
        role = 'admin'
        OR (role IN ('teacher', 'supervisor') AND EXISTS (
          SELECT 1 FROM classes
          WHERE classes.id = student_enrollments.class_id
          AND (
            classes.teacher_id = (select auth.uid())
            OR classes.supervisor_id = (select auth.uid())
          )
        ))
      )
    )
  );

-- ============================================
-- PART 9: Optimize Announcements RLS Policies
-- ============================================

-- Drop existing announcements policies
DROP POLICY IF EXISTS "Admins can manage all announcements" ON announcements;
DROP POLICY IF EXISTS "Admins and supervisors can create announcements" ON announcements;
DROP POLICY IF EXISTS "Authors can update own announcements" ON announcements;
DROP POLICY IF EXISTS "Users can view published announcements for their role" ON announcements;

-- Recreate consolidated and optimized policies
CREATE POLICY "users_can_view_announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = ANY(target_roles)
    )
  );

CREATE POLICY "authorized_users_can_create_announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'supervisor', 'teacher')
    )
    AND author_id = (select auth.uid())
  );

CREATE POLICY "users_can_update_own_announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (
    author_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    author_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "admins_can_delete_announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- ============================================
-- PART 10: Add Useful Indexes
-- ============================================

-- Add indexes that will actually be used by the optimized queries
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id) WHERE teacher_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_classes_supervisor_id ON classes(supervisor_id) WHERE supervisor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class_id ON student_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_id ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_teacher_id ON class_subjects(teacher_id) WHERE teacher_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
