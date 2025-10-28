# تطبيق Migration على Supabase السحابي

## المشكلة ⚠️

```
Failed to load resource: the server responded with a status of 404
tenxnwdbgunmnnqldrve.supabase.co/rest/v1/rpc/get_all_classes:1
```

الخطأ يحدث لأن Migration لم يتم تطبيقه على Supabase السحابي.

## الحل السريع ✅

### الخطوة 1: تطبيق Migration في Supabase Dashboard

1. **افتح Supabase Dashboard:**
   - اذهب إلى [supabase.com](https://supabase.com)
   - سجل دخول إلى حسابك
   - اختر مشروعك

2. **انتقل إلى SQL Editor:**
   - من القائمة الجانبية، اضغط على "SQL Editor"
   - اضغط "New Query"

3. **انسخ والصق الكود التالي:**

```sql
-- ============================================
-- إنشاء جدول Classes
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
-- إنشاء جدول Student Enrollments
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
-- إنشاء جدول Class Subjects
-- ============================================

CREATE TABLE IF NOT EXISTS class_subjects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  teacher_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- إنشاء الفهارس
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
-- إنشاء الدوال
-- ============================================

-- دالة توليد رمز الفصل
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

-- دالة تحديث updated_at
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

-- دالة الحصول على جميع الفصول للأدمن
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
  SELECT p.role INTO user_role FROM profiles p WHERE p.id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can view all classes';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id, c.class_code, c.class_name, c.description,
    c.start_date, c.end_date, c.level, c.image_url,
    c.goals, c.notes, c.teacher_id, c.supervisor_id,
    c.is_active, c.created_at, c.updated_at,
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

-- ============================================
-- إنشاء Triggers
-- ============================================

-- Trigger لتوليد رمز الفصل تلقائياً
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

-- Trigger لتحديث updated_at
CREATE TRIGGER trigger_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- تفعيل RLS
-- ============================================

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- إنشاء السياسات الأمنية
-- ============================================

-- سياسات الفصول
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

-- سياسات تسجيل الطلاب
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

-- سياسات مواد الفصل
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
-- منح الصلاحيات
-- ============================================

GRANT ALL ON classes TO authenticated;
GRANT ALL ON student_enrollments TO authenticated;
GRANT ALL ON class_subjects TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_classes() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_class_code() TO authenticated;

-- ============================================
-- إدراج بيانات تجريبية
-- ============================================

-- إدراج فصول تجريبية (فقط إذا لم تكن موجودة)
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
```

4. **اضغط "Run" لتنفيذ الكود**

### الخطوة 2: التحقق من النجاح

بعد تنفيذ الكود، تحقق من:

1. **في SQL Editor، نفذ:**
```sql
-- التحقق من الجداول
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('classes', 'student_enrollments', 'class_subjects');

-- التحقق من الفصول التجريبية
SELECT * FROM classes;
```

2. **في التطبيق:**
   - افتح `http://localhost:3500`
   - سجل دخول كـ Admin
   - انتقل إلى `/dashboard/classes`
   - يجب أن تظهر الصفحة بدون أخطاء

### الخطوة 3: إذا استمر الخطأ

إذا استمر الخطأ، جرب هذا الحل البديل:

1. **في صفحة Classes، أضف هذا الكود مؤقتاً:**

```tsx
const fetchClasses = async () => {
  try {
    setLoading(true);
    
    // استخدام الاستعلام المباشر فقط (بدون RPC)
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        teacher:profiles!teacher_id(full_name),
        supervisor:profiles!supervisor_id(full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to fetch classes');
      return;
    }

    // إضافة عدد الطلاب لكل فصل
    const classesWithCounts = await Promise.all(
      (data || []).map(async (cls) => {
        const { count } = await supabase
          .from('student_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id);
        
        return {
          ...cls,
          teacher_name: cls.teacher?.full_name || 'Unassigned',
          supervisor_name: cls.supervisor?.full_name || 'Unassigned',
          student_count: count || 0,
        };
      })
    );
    
    setClasses(classesWithCounts);
  } catch (err) {
    console.error('Unexpected error:', err);
    toast.error('An unexpected error occurred');
  } finally {
    setLoading(false);
  }
};
```

## النتيجة المتوقعة

بعد تطبيق هذا الحل:

- ✅ لا توجد أخطاء 404 أو 500
- ✅ صفحة Classes تعمل بشكل صحيح
- ✅ جميع المعلومات المطلوبة متوفرة
- ✅ نظام إدارة شامل للفصول

## ملاحظات مهمة

1. **تأكد من أنك أدمن** في النظام
2. **تحقق من اتصال الإنترنت** مع Supabase
3. **إذا استمر الخطأ**، استخدم الحل البديل أعلاه
4. **احفظ نسخة احتياطية** من قاعدة البيانات قبل التطبيق

هذا الحل يجب أن يحل المشكلة نهائياً! 🎯
