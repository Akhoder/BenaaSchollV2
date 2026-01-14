/*
  # إصلاح دالة check_certificate_eligibility

  ## المشاكل
  1. استخدام `completed = true` بدلاً من `status = 'completed'` في lesson_progress
  2. استخدام `status = 'completed'` بدلاً من `status = 'graded'` في quiz_attempts

  ## الحل
  - تحديث الدالة لاستخدام الحقول الصحيحة
*/

CREATE OR REPLACE FUNCTION public.check_certificate_eligibility(p_student_id uuid, p_subject_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_lessons_total integer;
  v_lessons_completed integer;
  v_quizzes_total integer;
  v_quizzes_graded integer;
  v_final_score numeric;
  v_grade text;
  v_eligible boolean := false;
BEGIN
  -- Count total lessons for this subject
  SELECT count(*) INTO v_lessons_total
  FROM public.lessons
  WHERE subject_id = p_subject_id AND status = 'published';

  -- ✅ FIX: استخدام status = 'completed' بدلاً من completed = true
  SELECT count(*) INTO v_lessons_completed
  FROM public.lesson_progress
  WHERE student_id = p_student_id
    AND lesson_id IN (SELECT id FROM public.lessons WHERE subject_id = p_subject_id)
    AND status = 'completed';

  -- Count total quizzes for this subject
  SELECT count(*) INTO v_quizzes_total
  FROM public.quizzes
  WHERE subject_id = p_subject_id
    AND (end_at IS NULL OR end_at > now());

  -- ✅ FIX: استخدام status = 'graded' بدلاً من status = 'completed'
  SELECT count(DISTINCT q.id) INTO v_quizzes_graded
  FROM public.quizzes q
  INNER JOIN public.quiz_attempts qa ON q.id = qa.quiz_id
  WHERE q.subject_id = p_subject_id
    AND qa.student_id = p_student_id
    AND qa.status = 'graded'
    AND (q.end_at IS NULL OR q.end_at > now());

  -- Calculate final score (average of quiz scores)
  SELECT coalesce(avg(qa.score), 0) INTO v_final_score
  FROM public.quiz_attempts qa
  INNER JOIN public.quizzes q ON qa.quiz_id = q.id
  WHERE q.subject_id = p_subject_id
    AND qa.student_id = p_student_id
    AND qa.status = 'graded';

  -- Calculate grade
  v_grade := public.calculate_grade(v_final_score);

  -- Check eligibility: all lessons completed and all quizzes graded
  IF v_lessons_total > 0 AND v_lessons_completed = v_lessons_total
     AND v_quizzes_total > 0 AND v_quizzes_graded = v_quizzes_total THEN
    v_eligible := true;
  END IF;

  RETURN jsonb_build_object(
    'eligible', v_eligible,
    'lessons_total', v_lessons_total,
    'lessons_completed', v_lessons_completed,
    'quizzes_total', v_quizzes_total,
    'quizzes_graded', v_quizzes_graded,
    'final_score', v_final_score,
    'grade', v_grade
  );
END;
$function$;

COMMENT ON FUNCTION public.check_certificate_eligibility IS 'يتحقق من أهلية الطالب للحصول على الشهادة - تم إصلاحه';
