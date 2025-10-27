/*
  # Add Admin Helper Functions and Policies

  ## Overview
  This migration adds helper functions and policies to allow admins to manage users
  without causing policy recursion.

  ## Changes
  1. Add helper function to check if user is admin
  2. Add policies for admins to manage all profiles
  3. Add policies for teachers and supervisors to view relevant profiles

  ## Security
  - Uses a function to check admin role (prevents recursion)
  - Admins can manage all profiles
  - Teachers can view student profiles in their classes
  - Supervisors can view profiles in their assigned classes
*/

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
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

-- Helper function to check if current user is teacher
CREATE OR REPLACE FUNCTION is_teacher()
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

-- Add admin policies
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin());

-- Teachers can view students in their classes
CREATE POLICY "Teachers can view their students"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    is_teacher() AND role = 'student' AND EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN classes c ON c.id = se.class_id
      WHERE se.student_id = profiles.id
        AND c.teacher_id = auth.uid()
    )
  );

-- Supervisors can view students in their supervised classes
CREATE POLICY "Supervisors can view their students"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'supervisor'
    AND role = 'student'
    AND EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN classes c ON c.id = se.class_id
      WHERE se.student_id = profiles.id
        AND c.supervisor_id = auth.uid()
    )
  );
