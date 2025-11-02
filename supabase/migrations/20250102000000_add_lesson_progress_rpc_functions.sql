/*
  # Add Lesson Progress RPC Functions Only
  
  Purpose: Add RPC functions for lesson progress tracking
  - These functions are already defined in the main migration
  - But if the table exists without functions, run this separately
  
  IMPORTANT: Only run this if you already have the lesson_progress table!
*/

-- ============================================
-- RPC Function: get_or_create_lesson_progress
-- ============================================

CREATE OR REPLACE FUNCTION get_or_create_lesson_progress(
  p_student_id uuid,
  p_lesson_id uuid
)
RETURNS lesson_progress AS $$
DECLARE
  result lesson_progress;
BEGIN
  -- Try to get existing progress
  SELECT * INTO result
  FROM lesson_progress
  WHERE student_id = p_student_id
    AND lesson_id = p_lesson_id;
  
  -- Create if doesn't exist
  IF result.id IS NULL THEN
    INSERT INTO lesson_progress (student_id, lesson_id, status, last_accessed_at)
    VALUES (p_student_id, p_lesson_id, 'not_started', now())
    RETURNING * INTO result;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC Function: update_lesson_progress
-- ============================================

CREATE OR REPLACE FUNCTION update_lesson_progress(
  p_student_id uuid,
  p_lesson_id uuid,
  p_progress_percentage integer,
  p_status text DEFAULT NULL,
  p_video_position numeric DEFAULT NULL,
  p_time_spent integer DEFAULT NULL
)
RETURNS lesson_progress AS $$
DECLARE
  result lesson_progress;
  final_status text;
BEGIN
  -- Determine final status
  IF p_status IS NOT NULL THEN
    final_status := p_status;
  ELSIF p_progress_percentage >= 100 THEN
    final_status := 'completed';
  ELSIF p_progress_percentage > 0 THEN
    final_status := 'in_progress';
  ELSE
    final_status := 'not_started';
  END IF;
  
  -- Upsert progress
  INSERT INTO lesson_progress (
    student_id, 
    lesson_id, 
    status, 
    progress_percentage, 
    last_accessed_at,
    video_position,
    time_spent_seconds,
    completed_at
  )
  VALUES (
    p_student_id,
    p_lesson_id,
    final_status,
    p_progress_percentage,
    now(),
    COALESCE(p_video_position, 0),
    COALESCE(p_time_spent, 0),
    CASE WHEN final_status = 'completed' THEN now() ELSE NULL END
  )
  ON CONFLICT (student_id, lesson_id)
  DO UPDATE SET
    status = final_status,
    progress_percentage = p_progress_percentage,
    last_accessed_at = now(),
    video_position = COALESCE(p_video_position, lesson_progress.video_position),
    time_spent_seconds = lesson_progress.time_spent_seconds + COALESCE(p_time_spent, 0),
    completed_at = CASE 
      WHEN final_status = 'completed' AND lesson_progress.completed_at IS NULL THEN now()
      ELSE lesson_progress.completed_at
    END,
    updated_at = now()
  RETURNING * INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RPC Function: get_subject_progress
-- ============================================

CREATE OR REPLACE FUNCTION get_subject_progress(
  p_student_id uuid,
  p_subject_id uuid
)
RETURNS TABLE (
  total_lessons bigint,
  completed_lessons bigint,
  in_progress_lessons bigint,
  not_started_lessons bigint,
  overall_progress numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(l.id)::bigint as total_lessons,
    COUNT(CASE WHEN lp.status = 'completed' THEN 1 END)::bigint as completed_lessons,
    COUNT(CASE WHEN lp.status = 'in_progress' THEN 1 END)::bigint as in_progress_lessons,
    COUNT(CASE WHEN lp.status = 'not_started' OR lp.status IS NULL THEN 1 END)::bigint as not_started_lessons,
    COALESCE(
      ROUND(
        (COUNT(CASE WHEN lp.status = 'completed' THEN 1 END)::numeric / NULLIF(COUNT(l.id), 0)) * 100,
        1
      ),
      0
    ) as overall_progress
  FROM lessons l
  LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.student_id = p_student_id
  WHERE l.subject_id = p_subject_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

