-- Fix RLS policy to allow students to view all published classes (not just enrolled ones)
-- This allows students to see available classes for enrollment

-- Drop the incorrect policy that only allows viewing enrolled classes
DROP POLICY IF EXISTS "classes_select_published" ON public.classes;

-- Create correct policy: Students can view all published classes
-- Admins, teachers, and supervisors can view all classes (published or not)
CREATE POLICY "classes_select_published" ON public.classes
  FOR SELECT TO authenticated
  USING (
    -- Allow viewing if class is published (for all authenticated users including students)
    published = true
    OR
    -- Allow admins, teachers, and supervisors to view all classes
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'teacher', 'supervisor')
    )
    OR
    -- Allow students to view classes they're enrolled in (even if not published)
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      WHERE se.student_id = auth.uid()
      AND se.class_id = classes.id
      AND se.status = 'active'
    )
  );

