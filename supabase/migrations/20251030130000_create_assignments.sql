/*
  # Create Assignments and Submissions Tables
  
  Tables:
  1. assignments - Assignments/Quizzes/Tests for subjects
  2. assignment_submissions - Student submissions for assignments
*/

-- ============================================
-- PART 1: Create Assignments Table
-- ============================================

CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assignment_type text NOT NULL DEFAULT 'homework' CHECK (assignment_type IN ('homework', 'quiz', 'test', 'project')),
  grade_weight numeric(5,2) DEFAULT 1.00 CHECK (grade_weight >= 0 AND grade_weight <= 100),
  start_date timestamptz,
  due_date timestamptz,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  instructions text,
  total_points numeric(8,2) DEFAULT 100.00,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT due_after_start CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_assignments_subject_id ON assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- ============================================
-- PART 2: Create Assignment Submissions Table
-- ============================================

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_content text,
  submission_files jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned', 'late')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz,
  score numeric(8,2),
  feedback text,
  graded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON assignment_submissions(status);

-- ============================================
-- PART 3: Create Updated At Triggers
-- ============================================

CREATE OR REPLACE FUNCTION update_assignment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assignments_updated_at ON assignments;
CREATE TRIGGER trigger_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_assignment_updated_at();

DROP TRIGGER IF EXISTS trigger_submissions_updated_at ON assignment_submissions;
CREATE TRIGGER trigger_submissions_updated_at
  BEFORE UPDATE ON assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_assignment_updated_at();

-- ============================================
-- PART 4: Enable RLS
-- ============================================

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 5: Create RLS Policies for Assignments
-- ============================================

-- Admins can do everything
DROP POLICY IF EXISTS "assignments_admin_all" ON assignments;
CREATE POLICY "assignments_admin_all"
  ON assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Teachers can manage assignments for their subjects
DROP POLICY IF EXISTS "assignments_teacher_manage" ON assignments;
CREATE POLICY "assignments_teacher_manage"
  ON assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher'))
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM class_subjects cs WHERE cs.id = subject_id AND cs.teacher_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher'))
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM class_subjects cs WHERE cs.id = subject_id AND cs.teacher_id = auth.uid())
    )
  );

-- Students can read published assignments for enrolled subjects
DROP POLICY IF EXISTS "assignments_student_read" ON assignments;
CREATE POLICY "assignments_student_read"
  ON assignments FOR SELECT
  TO authenticated
  USING (
    status IN ('published', 'closed')
    AND EXISTS (
      SELECT 1 FROM subject_enrollments se
      WHERE se.subject_id = assignments.subject_id
        AND se.student_id = auth.uid()
        AND se.status = 'active'
    )
  );

-- ============================================
-- PART 6: Create RLS Policies for Submissions
-- ============================================

-- Admins can do everything
DROP POLICY IF EXISTS "submissions_admin_all" ON assignment_submissions;
CREATE POLICY "submissions_admin_all"
  ON assignment_submissions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Students can create and view their own submissions
DROP POLICY IF EXISTS "submissions_student_own" ON assignment_submissions;
CREATE POLICY "submissions_student_own"
  ON assignment_submissions FOR ALL
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Teachers can view and grade submissions for their assignments
DROP POLICY IF EXISTS "submissions_teacher_view" ON assignment_submissions;
CREATE POLICY "submissions_teacher_view"
  ON assignment_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher'))
  );

DROP POLICY IF EXISTS "submissions_teacher_update" ON assignment_submissions;
CREATE POLICY "submissions_teacher_update"
  ON assignment_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'teacher'))
  );

-- ============================================
-- PART 7: Grant Permissions
-- ============================================

GRANT ALL ON assignments TO authenticated;
GRANT ALL ON assignment_submissions TO authenticated;

