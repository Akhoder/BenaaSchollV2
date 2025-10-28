# إصلاح خطأ Classes Page - 500 Error

## المشكلة ⚠️

```
Failed to load resource: the server responded with a status of 500
tenxnwdbgunmnnqldrve.supabase.co/rest/v1/classes?select=*%2Cteacher%3Aprofiles%21teacher_id%28full_name%29%2Csupervisor%3Aprofiles%21supervisor_id%28full_name%29&order=created_at.desc:1
```

## السبب 🔍

الخطأ 500 يحدث لأن جدول `classes` غير موجود في قاعدة البيانات. صفحة Classes تحاول الوصول إلى جدول غير موجود.

## الحل ✅

تم إنشاء migration شامل لإنشاء جميع الجداول المطلوبة:

### 1. **إنشاء الجداول**

#### جدول `classes` (الفصول):
```sql
CREATE TABLE classes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_code text UNIQUE NOT NULL,           -- رمز الفصل (Auto Generated)
  class_name text NOT NULL,                  -- اسم الفصل
  description text,                          -- وصف الفصل
  start_date date NOT NULL,                  -- تاريخ البدء
  end_date date,                             -- تاريخ الانتهاء (اختياري)
  level integer NOT NULL CHECK (level >= 1 AND level <= 12), -- المستوى: أرقام
  image_url text,                            -- صورة
  goals text,                                -- الأهداف
  notes text,                                -- ملاحظات
  teacher_id uuid REFERENCES profiles(id),  -- المعلم
  supervisor_id uuid REFERENCES profiles(id), -- المشرف
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### جدول `student_enrollments` (تسجيل الطلاب):
```sql
CREATE TABLE student_enrollments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'dropped')),
  UNIQUE(student_id, class_id)
);
```

#### جدول `class_subjects` (مواد الفصل):
```sql
CREATE TABLE class_subjects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  teacher_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
```

### 2. **الوظائف المطلوبة**

#### توليد رمز الفصل تلقائياً:
```sql
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
  
  -- التحقق من عدم التكرار
  SELECT COUNT(*) INTO exists_count FROM classes WHERE class_code = class_code;
  WHILE exists_count > 0 LOOP
    random_part := upper(substring(md5(random()::text) from 1 for 3));
    class_code := 'CLS-' || timestamp_part || '-' || random_part;
    SELECT COUNT(*) INTO exists_count FROM classes WHERE class_code = class_code;
  END LOOP;
  
  RETURN class_code;
END;
$$;
```

#### دالة للحصول على جميع الفصول (للأدمن):
```sql
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
  -- التحقق من أن المستخدم أدمن
  SELECT p.role INTO user_role FROM profiles p WHERE p.id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can view all classes';
  END IF;
  
  -- إرجاع جميع الفصول مع البيانات المرتبطة
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
```

### 3. **السياسات الأمنية (RLS)**

#### للفصول:
```sql
-- الأدمن يمكنه إدارة جميع الفصول
CREATE POLICY "Admins can manage all classes"
  ON classes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- المعلم يمكنه عرض فصوله
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

-- الطالب يمكنه عرض فصوله المسجلة
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
```

### 4. **التحديثات في الكود**

#### تحديث دالة fetchClasses:
```tsx
const fetchClasses = async () => {
  try {
    setLoading(true);
    
    // استخدام دالة RPC للأدمن أولاً
    if (profile?.role === 'admin') {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_classes');
      
      if (!rpcError && rpcData) {
        setClasses(rpcData);
        return;
      } else {
        console.error('RPC Error:', rpcError);
      }
    }
    
    // استخدام الاستعلام المباشر كبديل
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

#### تحديث إنشاء الفصل:
```tsx
const { error } = await supabase
  .from('classes')
  .insert({
    class_code: classCode,
    class_name: formData.name,        // تم تصحيح اسم العمود
    start_date: formData.start_date,
    end_date: formData.end_date || null,
    level: formData.level,
    image_url: formData.image_url || null,
    goals: formData.objectives,       // تم تصحيح اسم العمود
    notes: formData.notes || null,
    teacher_id: formData.teacher_id || null,
    supervisor_id: formData.supervisor_id || null,
  });
```

## كيفية التطبيق

### 1. **تشغيل Migration**
```bash
# في Supabase Dashboard
# انتقل إلى SQL Editor
# انسخ محتوى الملف: supabase/migrations/20251028010000_create_classes_tables.sql
# اضغط Run
```

### 2. **التحقق من الجداول**
```sql
-- التحقق من إنشاء الجداول
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('classes', 'student_enrollments', 'class_subjects');

-- التحقق من البيانات التجريبية
SELECT * FROM classes;
```

### 3. **اختبار الصفحة**
1. افتح `http://localhost:3500`
2. سجل دخول كـ Admin
3. انتقل إلى `/dashboard/classes`
4. يجب أن تظهر الصفحة بدون أخطاء

## الميزات الجديدة

### ✅ **جميع المعلومات المطلوبة متوفرة:**
- رمز الفصل (Auto Generated): `CLS-123456-ABC`
- اسم الفصل: حقل مطلوب
- تاريخ البدء: حقل مطلوب
- تاريخ الانتهاء: حقل اختياري
- المستوى: أرقام 1-12
- صورة: رابط الصورة
- الأهداف: نص مفصل
- ملاحظات: نص إضافي

### ✅ **ميزات إضافية:**
- إحصائيات الفصول
- البحث والتصفية
- إدارة المعلمين والمشرفين
- تتبع تسجيل الطلاب
- سياسات أمنية شاملة

## النتيجة

بعد تطبيق هذا الإصلاح:

- ✅ لا توجد أخطاء 500
- ✅ صفحة Classes تعمل بشكل صحيح
- ✅ جميع المعلومات المطلوبة متوفرة
- ✅ نظام إدارة شامل للفصول
- ✅ أمان وصول متقدم

الإصلاح شامل ويغطي جميع المتطلبات! 🎓✨
