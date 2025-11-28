-- إصلاح نوع البيانات المرتجع من الدالة (تعديل level من TEXT إلى INTEGER)
-- Fix return type mismatch: change 'level' from TEXT to INTEGER to match the table schema

DROP FUNCTION IF EXISTS get_published_classes_public();

CREATE OR REPLACE FUNCTION get_published_classes_public()
RETURNS TABLE (
  id UUID,
  class_name TEXT,
  teacher_id UUID,
  level INTEGER, -- Changed from TEXT to INTEGER to match table column type
  image_url TEXT,
  created_at TIMESTAMPTZ,
  teacher_name TEXT,
  teacher_avatar TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.class_name,
    c.teacher_id,
    c.level, -- This column is integer in the table
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

GRANT EXECUTE ON FUNCTION get_published_classes_public() TO anon, authenticated, service_role;

