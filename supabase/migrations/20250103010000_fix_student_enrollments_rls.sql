/*
  # Fix Student Enrollments RLS Policies - Remove Infinite Recursion
  
  Purpose: Fix infinite recursion in student_enrollments RLS policies
  - Remove conflicting policies from multiple migrations
  - Create simple, non-recursive policies
  - Use SECURITY DEFINER functions to avoid recursion
*/

-- ============================================
-- PART 1: Drop ALL existing policies on student_enrollments
-- ============================================

DROP POLICY IF EXISTS "enrollments_admin_all" ON student_enrollments;
DROP POLICY IF EXISTS "enrollments_teacher_view" ON student_enrollments;
DROP POLICY IF EXISTS "enrollments_student_view" ON student_enrollments;
DROP POLICY IF EXISTS "users_can_view_enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "students_can_enroll_in_classes" ON student_enrollments;
DROP POLICY IF EXISTS "students_can_update_own_enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "Teachers can view enrollments in their classes" ON student_enrollments;
DROP POLICY IF EXISTS "Students can view their own enrollments" ON student_enrollments;

-- ============================================
-- PART 2: Ensure helper functions exist
-- ============================================

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

-- ============================================
-- PART 3: Create Simple, Non-Recursive Policies
-- ============================================

-- Policy 1: Admins can do everything
CREATE POLICY "enrollments_admin_all"
ON student_enrollments FOR ALL
TO authenticated
USING (is_admin_user())
WITH CHECK (is_admin_user());

-- Policy 2: Students can view their own enrollments (SIMPLE - no recursion)
CREATE POLICY "enrollments_student_view"
ON student_enrollments FOR SELECT
TO authenticated
USING (
  is_admin_user() OR 
  student_id = auth.uid()
);

-- Policy 3: Students can insert their own enrollments
CREATE POLICY "enrollments_student_insert"
ON student_enrollments FOR INSERT
TO authenticated
WITH CHECK (
  is_admin_user() OR 
  (student_id = auth.uid())
);

-- Policy 4: Students can update their own enrollments
CREATE POLICY "enrollments_student_update"
ON student_enrollments FOR UPDATE
TO authenticated
USING (is_admin_user() OR student_id = auth.uid())
WITH CHECK (is_admin_user() OR student_id = auth.uid());

-- Policy 5: Teachers can view enrollments (WITHOUT checking classes to avoid recursion)
CREATE POLICY "enrollments_teacher_view"
ON student_enrollments FOR SELECT
TO authenticated
USING (
  is_admin_user() OR 
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('teacher', 'supervisor')
  )
);

-- ============================================
-- PART 4: Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;

