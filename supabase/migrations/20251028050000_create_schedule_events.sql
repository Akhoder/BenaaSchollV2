/*
  # Create schedule_events with RLS and indexes
*/

-- Table
CREATE TABLE IF NOT EXISTS schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  room text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  recurrence_rule text,
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schedule_events_time ON schedule_events(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_schedule_events_class ON schedule_events(class_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_teacher ON schedule_events(teacher_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION schedule_events_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_schedule_events_updated_at ON schedule_events;
CREATE TRIGGER trg_schedule_events_updated_at
BEFORE UPDATE ON schedule_events
FOR EACH ROW EXECUTE FUNCTION schedule_events_set_updated_at();

-- RLS
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;

-- Admin: all
DROP POLICY IF EXISTS "sched_admin_all" ON schedule_events;
CREATE POLICY "sched_admin_all" ON schedule_events FOR ALL TO authenticated
USING (is_admin_user()) WITH CHECK (is_admin_user());

-- Teacher: view events of self or classes he teaches
DROP POLICY IF EXISTS "sched_teacher_select" ON schedule_events;
CREATE POLICY "sched_teacher_select" ON schedule_events FOR SELECT TO authenticated
USING (
  is_admin_user() OR 
  teacher_id = auth.uid() OR 
  (class_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM classes c WHERE c.id = schedule_events.class_id AND c.teacher_id = auth.uid()
  ))
);

-- Teacher: modify only own-created or assigned events
DROP POLICY IF EXISTS "sched_teacher_modify" ON schedule_events;
CREATE POLICY "sched_teacher_modify" ON schedule_events FOR INSERT TO authenticated
WITH CHECK (
  is_admin_user() OR created_by = auth.uid() OR teacher_id = auth.uid()
);

CREATE POLICY "sched_teacher_update" ON schedule_events FOR UPDATE TO authenticated
USING (
  is_admin_user() OR created_by = auth.uid() OR teacher_id = auth.uid()
)
WITH CHECK (
  is_admin_user() OR created_by = auth.uid() OR teacher_id = auth.uid()
);

CREATE POLICY "sched_teacher_delete" ON schedule_events FOR DELETE TO authenticated
USING (
  is_admin_user() OR created_by = auth.uid() OR teacher_id = auth.uid()
);

-- Student: view events of enrolled classes
DROP POLICY IF EXISTS "sched_student_select" ON schedule_events;
CREATE POLICY "sched_student_select" ON schedule_events FOR SELECT TO authenticated
USING (
  is_admin_user() OR 
  (class_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM student_enrollments se
    WHERE se.class_id = schedule_events.class_id AND se.student_id = auth.uid() AND se.status = 'active'
  ))
);


