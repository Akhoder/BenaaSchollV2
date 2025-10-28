/*
  # Create Classes and Related Tables
  
  ## Overview
  This migration creates the classes table and related tables needed for the school management system.
  
  ## Tables Created
  1. classes - Main classes table
  2. student_enrollments - Student enrollment in classes
  3. class_subjects - Subjects taught in each class
  
  ## Features
  - Auto-generated class codes
  - Teacher and supervisor assignments
  - Student enrollment tracking
  - Subject management per class
  - Proper RLS policies
*/

-- ============================================
-- PART 1: Create Classes Table
-- ============================================

CREATE TABLE IF NOT EXISTS classes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_code text UNIQUE NOT NULL,
  class_name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,
  level integer NOT NULL CHECK (level >= 1 AND level <= 12),
  image_url text,
  goals text,
  notes text,
  teacher_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  supervisor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- PART 2: Create Student Enrollments Table
-- ============================================

CREATE TABLE IF NOT EXISTS student_enrollments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'dropped')),
  UNIQUE(student_id, class_id)
);

-- ============================================
-- PART 3: Create Class Subjects Table
-- ============================================

CREATE TABLE IF NOT EXISTS class_subjects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  teacher_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- PART 4: Create Indexes
-- ============================================

-- Classes indexes
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id) WHERE teacher_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_classes_supervisor_id ON classes(supervisor_id) WHERE supervisor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level);
CREATE INDEX IF NOT EXISTS idx_classes_active ON classes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_classes_code ON classes(class_code);

-- Student enrollments indexes
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class_id ON student_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_status ON student_enrollments(status);

-- Class subjects indexes
CREATE INDEX IF NOT EXISTS idx_class_subjects_class_id ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_teacher_id ON class_subjects(teacher_id) WHERE teacher_id IS NOT NULL;

-- ============================================
-- PART 5: Create Functions
-- ============================================

-- Function to generate unique class code
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  timestamp_part text;
  random_part text;
  class_code text;
  exists_count integer;
BEGIN
  -- Generate timestamp part (last 6 digits of current timestamp)
  timestamp_part := right(extract(epoch from now())::text, 6);
  
  -- Generate random 3-character part
  random_part := upper(substring(md5(random()::text) from 1 for 3));
  
  -- Combine parts
  class_code := 'CLS-' || timestamp_part || '-' || random_part;
  
  -- Check if code already exists (very unlikely but safe)
  SELECT COUNT(*) INTO exists_count FROM classes WHERE class_code = class_code;
  
  -- If exists, generate new one
  WHILE exists_count > 0 LOOP
    random_part := upper(substring(md5(random()::text) from 1 for 3));
    class_code := 'CLS-' || timestamp_part || '-' || random_part;
    SELECT COUNT(*) INTO exists_count FROM classes WHERE class_code = class_code;
  END LOOP;
  
  RETURN class_code;
END;
$$;

-- Function to update updated_at timestamp
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

-- ============================================
-- PART 6: Create Triggers
-- ============================================

-- Trigger to auto-generate class code
CREATE OR REPLACE FUNCTION set_class_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.class_code IS NULL OR NEW.class_code = '' THEN
    NEW.class_code := generate_class_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_class_code
  BEFORE INSERT ON classes
  FOR EACH ROW EXECUTE FUNCTION set_class_code();

-- Trigger to update updated_at
CREATE TRIGGER trigger_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- PART 7: Enable RLS
-- ============================================

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 8: Create RLS Policies
-- ============================================

-- Classes policies
CREATE POLICY "Admins can manage all classes"
  ON classes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Teachers can view their classes"
  ON classes FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Teachers can update their classes"
  ON classes FOR UPDATE
  TO authenticated
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Supervisors can view assigned classes"
  ON classes FOR SELECT
  TO authenticated
  USING (
    supervisor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Students can view enrolled classes"
  ON classes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      WHERE se.class_id = classes.id AND se.student_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Student enrollments policies
CREATE POLICY "Admins can manage all enrollments"
  ON student_enrollments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Teachers can view enrollments in their classes"
  ON student_enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = student_enrollments.class_id AND c.teacher_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Students can view their own enrollments"
  ON student_enrollments FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Class subjects policies
CREATE POLICY "Admins can manage all class subjects"
  ON class_subjects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Teachers can view subjects in their classes"
  ON class_subjects FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_subjects.class_id AND c.teacher_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================
-- PART 9: Grant Permissions
-- ============================================

-- Grant permissions to authenticated users
GRANT ALL ON classes TO authenticated;
GRANT ALL ON student_enrollments TO authenticated;
GRANT ALL ON class_subjects TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- PART 10: Insert Sample Data (Optional)
-- ============================================

-- Insert sample classes (only if no classes exist)
INSERT INTO classes (class_name, description, start_date, level, goals, teacher_id)
SELECT 
  'Mathematics Grade 10',
  'Advanced mathematics course for grade 10 students',
  CURRENT_DATE,
  10,
  'Master algebraic concepts, geometry, and problem-solving skills',
  p.id
FROM profiles p 
WHERE p.role = 'teacher' 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO classes (class_name, description, start_date, level, goals, teacher_id)
SELECT 
  'English Literature',
  'English literature and composition course',
  CURRENT_DATE,
  11,
  'Develop critical thinking, reading comprehension, and writing skills',
  p.id
FROM profiles p 
WHERE p.role = 'teacher' 
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 11: Create Helper Functions
-- ============================================

-- Function to get classes for admin
CREATE OR REPLACE FUNCTION get_all_classes()
RETURNS TABLE (
  id uuid,
  class_code text,
  class_name text,
  description text,
  start_date date,
  end_date date,
  level integer,
  image_url text,
  goals text,
  notes text,
  teacher_id uuid,
  supervisor_id uuid,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  teacher_name text,
  supervisor_name text,
  student_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Check if caller is admin
  SELECT p.role INTO user_role FROM profiles p WHERE p.id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can view all classes';
  END IF;
  
  -- Return all classes with related data
  RETURN QUERY
  SELECT 
    c.id,
    c.class_code,
    c.class_name,
    c.description,
    c.start_date,
    c.end_date,
    c.level,
    c.image_url,
    c.goals,
    c.notes,
    c.teacher_id,
    c.supervisor_id,
    c.is_active,
    c.created_at,
    c.updated_at,
    t.full_name as teacher_name,
    s.full_name as supervisor_name,
    COALESCE(se.student_count, 0) as student_count
  FROM classes c
  LEFT JOIN profiles t ON c.teacher_id = t.id
  LEFT JOIN profiles s ON c.supervisor_id = s.id
  LEFT JOIN (
    SELECT class_id, COUNT(*) as student_count
    FROM student_enrollments
    WHERE status = 'active'
    GROUP BY class_id
  ) se ON c.id = se.class_id
  ORDER BY c.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_classes() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_class_code() TO authenticated;
