/*
  # Add Lesson Progress Trigger Function
  
  Purpose: Add trigger function for auto-updating lesson_progress
*/

-- ============================================
-- Trigger Function: update_lesson_progress_updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_lesson_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Auto-update status based on progress_percentage
  IF NEW.progress_percentage >= 100 THEN
    NEW.status = 'completed';
    NEW.completed_at = COALESCE(NEW.completed_at, now());
  ELSIF NEW.progress_percentage > 0 THEN
    NEW.status = 'in_progress';
    IF OLD.status = 'not_started' THEN
      NEW.last_accessed_at = now();
    END IF;
  ELSE
    NEW.status = 'not_started';
  END IF;
  
  -- Update last_accessed_at on any progress change
  IF OLD.progress_percentage IS DISTINCT FROM NEW.progress_percentage THEN
    NEW.last_accessed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Create Trigger
-- ============================================

DROP TRIGGER IF EXISTS trigger_lesson_progress_updated_at ON lesson_progress;
CREATE TRIGGER trigger_lesson_progress_updated_at
  BEFORE UPDATE ON lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_progress_updated_at();

