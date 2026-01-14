/*
  # إصلاح نظام حساب الدرجات في الاختبارات

  ## التغييرات الرئيسية
  
  1. **إضافة حقل tolerance منفصل:**
     - فصل `tolerance` عن `media_url` في جدول `quiz_questions`
     - `media_url` سيُستخدم فقط للوسائط (صور، فيديو، إلخ)
     - `tolerance` سيُستخدم فقط للأسئلة الرقمية
  
  2. **إضافة trigger لتحديث attempt.score تلقائياً:**
     - عند إدراج أو تحديث `quiz_answers.points_awarded`
     - يتم حساب مجموع النقاط وتحديث `quiz_attempts.score`
     - يتم تحديث حالة المحاولة إلى 'graded' عند الحاجة
  
  3. **إضافة دالة لإعادة حساب الدرجات:**
     - دالة `recalculate_quiz_attempt_score(attempt_id)` 
     - يمكن استدعاؤها يدوياً عند الحاجة
     - تضمن دقة الحساب
  
  4. **إضافة indexes للأداء:**
     - فهرس على `quiz_answers(attempt_id)`
     - فهرس على `quiz_attempts(student_id, quiz_id)`
     - لتحسين سرعة الاستعلامات

  ## ملاحظات أمان
  - جميع التغييرات آمنة ومتوافقة مع البيانات الحالية
  - استخدام IF EXISTS/IF NOT EXISTS لتجنب الأخطاء
  - البيانات الحالية في media_url لن تتأثر
*/

-- ========================================
-- Step 1: إضافة حقل tolerance منفصل
-- ========================================

DO $$
BEGIN
  -- إضافة حقل tolerance إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_questions' AND column_name = 'tolerance'
  ) THEN
    ALTER TABLE quiz_questions 
    ADD COLUMN tolerance numeric;
    
    -- نقل البيانات الحالية من media_url إلى tolerance للأسئلة الرقمية
    UPDATE quiz_questions
    SET tolerance = CASE
      WHEN type = 'numeric' AND media_url IS NOT NULL THEN
        CASE
          WHEN media_url ~ '^[0-9]+\.?[0-9]*$' THEN media_url::numeric
          ELSE NULL
        END
      ELSE NULL
    END
    WHERE type = 'numeric';
    
    -- إضافة تعليق توضيحي
    COMMENT ON COLUMN quiz_questions.tolerance IS 'Tolerance value for numeric questions (±)';
  END IF;
END $$;

-- ========================================
-- Step 2: إضافة indexes للأداء
-- ========================================

-- فهرس على quiz_answers(attempt_id) لتسريع جمع النقاط
CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt_id 
ON quiz_answers(attempt_id);

-- فهرس على quiz_answers(attempt_id, points_awarded) لتحسين aggregate queries
CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt_points 
ON quiz_answers(attempt_id, points_awarded);

-- فهرس على quiz_attempts(student_id, quiz_id) لتسريع استعلامات الطلاب
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_quiz 
ON quiz_attempts(student_id, quiz_id);

-- فهرس على quiz_attempts(quiz_id, status) لتسريع استعلامات المعلمين
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_status 
ON quiz_attempts(quiz_id, status);

-- ========================================
-- Step 3: دالة إعادة حساب درجة المحاولة
-- ========================================

CREATE OR REPLACE FUNCTION recalculate_quiz_attempt_score(p_attempt_id uuid)
RETURNS void AS $$
DECLARE
  v_total_score numeric;
  v_all_graded boolean;
  v_has_answers boolean;
BEGIN
  -- حساب مجموع النقاط الممنوحة
  SELECT 
    COALESCE(SUM(COALESCE(points_awarded, 0)), 0),
    -- التحقق من أن جميع الإجابات تم تصحيحها
    BOOL_AND(
      points_awarded IS NOT NULL OR
      -- الأسئلة التلقائية تعتبر مصححة إذا كان is_correct موجود
      is_correct IS NOT NULL
    ),
    -- التحقق من وجود إجابات
    COUNT(*) > 0
  INTO v_total_score, v_all_graded, v_has_answers
  FROM quiz_answers
  WHERE attempt_id = p_attempt_id;
  
  -- تحديث درجة المحاولة
  UPDATE quiz_attempts
  SET 
    score = v_total_score,
    -- تحديث الحالة إلى 'graded' إذا تم تصحيح جميع الإجابات
    status = CASE
      WHEN status = 'in_progress' THEN status -- لا تغيير
      WHEN v_all_graded AND v_has_answers THEN 'graded'
      ELSE status
    END
  WHERE id = p_attempt_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_quiz_attempt_score IS 'يعيد حساب درجة المحاولة بناءً على مجموع النقاط الممنوحة';

-- ========================================
-- Step 4: Trigger لتحديث الدرجة تلقائياً
-- ========================================

CREATE OR REPLACE FUNCTION update_quiz_attempt_score_on_answer_change()
RETURNS TRIGGER AS $$
BEGIN
  -- إعادة حساب درجة المحاولة
  PERFORM recalculate_quiz_attempt_score(
    COALESCE(NEW.attempt_id, OLD.attempt_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- حذف trigger القديم إذا كان موجوداً
DROP TRIGGER IF EXISTS trg_quiz_answers_update_score ON quiz_answers;

-- إنشاء trigger جديد
CREATE TRIGGER trg_quiz_answers_update_score
AFTER INSERT OR UPDATE OF points_awarded, is_correct OR DELETE
ON quiz_answers
FOR EACH ROW
EXECUTE FUNCTION update_quiz_attempt_score_on_answer_change();

COMMENT ON TRIGGER trg_quiz_answers_update_score ON quiz_answers IS 'يحدّث درجة المحاولة تلقائياً عند تغيير النقاط الممنوحة';

-- ========================================
-- Step 5: إعادة حساب جميع الدرجات الحالية
-- ========================================

-- إعادة حساب درجات جميع المحاولات المقدمة والمصححة
DO $$
DECLARE
  v_attempt_record RECORD;
  v_count integer := 0;
BEGIN
  FOR v_attempt_record IN 
    SELECT DISTINCT id 
    FROM quiz_attempts 
    WHERE status IN ('submitted', 'graded')
  LOOP
    PERFORM recalculate_quiz_attempt_score(v_attempt_record.id);
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'تم إعادة حساب % محاولة', v_count;
END $$;
