-- دالة لجلب الدورات المنشورة لصفحة الهبوط (تتجاوز قيود الأمان للعرض العام)
-- Function to fetch published classes for the landing page (bypasses RLS for public view)

CREATE OR REPLACE FUNCTION get_published_classes_public()
RETURNS TABLE (
  id UUID,
  class_name TEXT,
  teacher_id UUID,
  level TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  teacher_name TEXT,
  teacher_avatar TEXT
) 
SECURITY DEFINER -- تعمل بصلاحيات منشئ الدالة (المسؤول)
SET search_path = public -- حماية من هجمات المسار
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.class_name,
    c.teacher_id,
    c.level,
    c.image_url,
    c.created_at,
    p.full_name as teacher_name,
    p.avatar_url as teacher_avatar
  FROM classes c
  LEFT JOIN profiles p ON c.teacher_id = p.id
  WHERE c.published = true
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- منح صلاحية التنفيذ للجميع (بما في ذلك غير المسجلين)
GRANT EXECUTE ON FUNCTION get_published_classes_public() TO anon, authenticated, service_role;

