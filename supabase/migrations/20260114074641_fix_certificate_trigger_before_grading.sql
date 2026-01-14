/*
  # إصلاح trigger الشهادات قبل تطبيق نظام الدرجات

  ## المشكلة
  - الدالة `notify_certificate_eligible` تحاول الوصول إلى `new.subject_id`
  - جدول `quiz_attempts` لا يحتوي على حقل `subject_id` مباشرة
  - يجب الحصول على `subject_id` من خلال join مع جدول `quizzes`

  ## الحل
  - تحديث الدالة للحصول على `subject_id` من `quizzes` table
  - استخدام LEFT JOIN لتجنب الأخطاء إذا كان quiz محذوف
*/

-- إصلاح دالة notify_certificate_eligible
CREATE OR REPLACE FUNCTION public.notify_certificate_eligible()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_eligibility jsonb;
  v_subject_name text;
  v_subject_id uuid;
BEGIN
  -- الحصول على subject_id من جدول quizzes
  SELECT q.subject_id INTO v_subject_id
  FROM public.quizzes q
  WHERE q.id = new.quiz_id;
  
  -- إذا لم يكن هناك subject_id (quiz غير مرتبط بمادة)، لا نفعل شيء
  IF v_subject_id IS NULL THEN
    RETURN new;
  END IF;
  
  -- التحقق من أهلية الطالب للحصول على الشهادة
  v_eligibility := public.check_certificate_eligibility(new.student_id, v_subject_id);

  IF (v_eligibility->>'eligible')::boolean THEN
    -- الحصول على اسم المادة
    SELECT subject_name INTO v_subject_name
    FROM public.class_subjects
    WHERE id = v_subject_id;

    -- التحقق من عدم وجود إشعار مماثل في اليوم الأخير
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE recipient_id = new.student_id
        AND type = 'certificate_eligible'
        AND link_url LIKE '%/dashboard/my-certificates%'
        AND created_at > now() - interval '1 day'
    ) THEN
      -- إنشاء إشعار
      INSERT INTO public.notifications (
        recipient_id,
        type,
        title,
        body,
        link_url
      ) VALUES (
        new.student_id,
        'certificate_eligible',
        'أنت مؤهل للحصول على شهادة',
        'أكملت جميع متطلبات الحصول على شهادة في مادة: ' || v_subject_name,
        '/dashboard/my-certificates'
      );
    END IF;
  END IF;

  RETURN new;
END;
$function$;

COMMENT ON FUNCTION public.notify_certificate_eligible IS 'يرسل إشعار للطالب عند استحقاقه للشهادة - تم إصلاحه للعمل مع quiz_attempts';
