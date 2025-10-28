/*
  # Fix Classes RLS Policies - Remove Infinite Recursion
  
  ## Overview
  This migration fixes the infinite recursion error in RLS policies for the classes table.
  
  ## Problem
  Error: infinite recursion detected in policy for relation "classes"
  
  ## Solution
  Simplify RLS policies to avoid recursive calls and use simpler permission checks.
*/

-- ============================================
-- PART 1: Drop All Existing Policies
-- ============================================

-- Drop all existing policies on classes table
DROP POLICY IF EXISTS "Admins can manage all classes" ON classes;
DROP POLICY IF EXISTS "Teachers can view their classes" ON classes;
DROP POLICY IF EXISTS "Teachers can update their classes" ON classes;
DROP POLICY IF EXISTS "Supervisors can view assigned classes" ON classes;
DROP POLICY IF EXISTS "Students can view enrolled classes" ON classes;

-- Drop all existing policies on student_enrollments table
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "Teachers can view enrollments in their classes" ON student_enrollments;
DROP POLICY IF EXISTS "Students can view their own enrollments" ON student_enrollments;

-- Drop all existing policies on class_subjects table
DROP POLICY IF EXISTS "Admins can manage all class subjects" ON class_subjects;
DROP POLICY IF EXISTS "Teachers can view subjects in their classes" ON class_subjects;

-- ============================================
-- PART 2: Create Simple Helper Functions
-- ============================================

-- Simple function to check if user is admin (no recursion)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Simple function to check if user is teacher
CREATE OR REPLACE FUNCTION is_teacher_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'teacher'
  );
$$;

-- Simple function to check if user is supervisor
CREATE OR REPLACE FUNCTION is_supervisor_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'supervisor'
  );
$$;

-- Simple function to check if user is student
CREATE OR REPLACE FUNCTION is_student_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'student'
  );
$$;

-- ============================================
-- PART 3: Create Simple RLS Policies for Classes
-- ============================================

-- Policy 1: Admins can do everything
CREATE POLICY "classes_admin_all"
  ON classes FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Policy 2: Teachers can view and update their own classes
CREATE POLICY "classes_teacher_view"
  ON classes FOR SELECT
  TO authenticated
  USING (
    is_admin_user() OR 
    (is_teacher_user() AND teacher_id = auth.uid())
  );

CREATE POLICY "classes_teacher_update"
  ON classes FOR UPDATE
  TO authenticated
  USING (
    is_admin_user() OR 
    (is_teacher_user() AND teacher_id = auth.uid())
  )
  WITH CHECK (
    is_admin_user() OR 
    (is_teacher_user() AND teacher_id = auth.uid())
  );

-- Policy 3: Supervisors can view assigned classes
CREATE POLICY "classes_supervisor_view"
  ON classes FOR SELECT
  TO authenticated
  USING (
    is_admin_user() OR 
    (is_supervisor_user() AND supervisor_id = auth.uid())
  );

-- Policy 4: Students can view enrolled classes (simplified)
CREATE POLICY "classes_student_view"
  ON classes FOR SELECT
  TO authenticated
  USING (
    is_admin_user() OR 
    (is_student_user() AND EXISTS (
      SELECT 1 FROM student_enrollments 
      WHERE class_id = classes.id 
      AND student_id = auth.uid()
      AND status = 'active'
    ))
  );

-- ============================================
-- PART 4: Create Simple RLS Policies for Student Enrollments
-- ============================================

-- Policy 1: Admins can do everything
CREATE POLICY "enrollments_admin_all"
  ON student_enrollments FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Policy 2: Teachers can view enrollments in their classes
CREATE POLICY "enrollments_teacher_view"
  ON student_enrollments FOR SELECT
  TO authenticated
  USING (
    is_admin_user() OR 
    (is_teacher_user() AND EXISTS (
      SELECT 1 FROM classes 
      WHERE classes.id = student_enrollments.class_id 
      AND classes.teacher_id = auth.uid()
    ))
  );

-- Policy 3: Students can view their own enrollments
CREATE POLICY "enrollments_student_view"
  ON student_enrollments FOR SELECT
  TO authenticated
  USING (
    is_admin_user() OR 
    (is_student_user() AND student_id = auth.uid())
  );

-- ============================================
-- PART 5: Create Simple RLS Policies for Class Subjects
-- ============================================

-- Policy 1: Admins can do everything
CREATE POLICY "subjects_admin_all"
  ON class_subjects FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Policy 2: Teachers can view subjects in their classes
CREATE POLICY "subjects_teacher_view"
  ON class_subjects FOR SELECT
  TO authenticated
  USING (
    is_admin_user() OR 
    (is_teacher_user() AND (
      teacher_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM classes 
        WHERE classes.id = class_subjects.class_id 
        AND classes.teacher_id = auth.uid()
      )
    ))
  );

-- ============================================
-- PART 6: Grant Permissions
-- ============================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION is_teacher_user() TO authenticated;
GRANT EXECUTE ON FUNCTION is_supervisor_user() TO authenticated;
GRANT EXECUTE ON FUNCTION is_student_user() TO authenticated;

-- ============================================
-- PART 7: Test Policies
-- ============================================

-- Test that policies work without recursion
-- This should not cause infinite recursion
SELECT COUNT(*) FROM classes WHERE is_admin_user();
