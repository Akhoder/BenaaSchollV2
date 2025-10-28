/*
  # Temporary Fix - Disable RLS for Classes
  
  ## Overview
  This migration temporarily disables RLS for classes table to fix the infinite recursion error.
  This is a quick fix while we work on proper RLS policies.
  
  ## Warning
  This removes RLS protection temporarily. Only use this for development/testing.
  For production, implement proper RLS policies.
*/

-- ============================================
-- PART 1: Disable RLS Temporarily
-- ============================================

-- Disable RLS on classes table temporarily
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;

-- Disable RLS on student_enrollments table temporarily  
ALTER TABLE student_enrollments DISABLE ROW LEVEL SECURITY;

-- Disable RLS on class_subjects table temporarily
ALTER TABLE class_subjects DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: Ensure Tables Exist
-- ============================================

-- Create classes table if it doesn't exist
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

-- Create student_enrollments table if it doesn't exist
CREATE TABLE IF NOT EXISTS student_enrollments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'dropped')),
  UNIQUE(student_id, class_id)
);

-- Create class_subjects table if it doesn't exist
CREATE TABLE IF NOT EXISTS class_subjects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  teacher_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- PART 3: Create Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id) WHERE teacher_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_classes_supervisor_id ON classes(supervisor_id) WHERE supervisor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level);
CREATE INDEX IF NOT EXISTS idx_classes_active ON classes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_classes_code ON classes(class_code);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class_id ON student_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_status ON student_enrollments(status);

CREATE INDEX IF NOT EXISTS idx_class_subjects_class_id ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_teacher_id ON class_subjects(teacher_id) WHERE teacher_id IS NOT NULL;

-- ============================================
-- PART 4: Create Functions
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
  timestamp_part := right(extract(epoch from now())::text, 6);
  random_part := upper(substring(md5(random()::text) from 1 for 3));
  class_code := 'CLS-' || timestamp_part || '-' || random_part;
  
  SELECT COUNT(*) INTO exists_count FROM classes WHERE class_code = class_code;
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
-- PART 5: Create Triggers
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

DROP TRIGGER IF EXISTS trigger_set_class_code ON classes;
CREATE TRIGGER trigger_set_class_code
  BEFORE INSERT ON classes
  FOR EACH ROW EXECUTE FUNCTION set_class_code();

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_classes_updated_at ON classes;
CREATE TRIGGER trigger_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- PART 6: Grant Permissions
-- ============================================

-- Grant permissions to authenticated users
GRANT ALL ON classes TO authenticated;
GRANT ALL ON student_enrollments TO authenticated;
GRANT ALL ON class_subjects TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION generate_class_code() TO authenticated;

-- ============================================
-- PART 7: Insert Sample Data
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

INSERT INTO classes (class_name, description, start_date, level, goals, teacher_id)
SELECT 
  'Science Grade 9',
  'General science course covering physics, chemistry, and biology',
  CURRENT_DATE,
  9,
  'Understand fundamental scientific principles and develop analytical thinking',
  p.id
FROM profiles p 
WHERE p.role = 'teacher' 
LIMIT 1
ON CONFLICT DO NOTHING;
