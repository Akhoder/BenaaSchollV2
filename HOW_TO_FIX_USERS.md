# كيفية إصلاح مشكلة عرض المستخدمين

## المشكلة
الصفحة `/dashboard/users` تعرض مستخدم واحد فقط بدلاً من 3 مستخدمين.

## الحل السريع ⚡

### الخطوة 1: افتح Supabase Dashboard
1. اذهب إلى https://supabase.com/dashboard
2. اختر مشروعك

### الخطوة 2: انسخ وألصق هذا الكود في SQL Editor

```sql
-- Add admin access to view all profiles
CREATE POLICY "admins_can_read_all_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_profiles() TO authenticated;
```

### الخطوة 3: اذهب للتطبيق واختبر
1. افتح http://localhost:3500
2. سجل دخول كـ Admin
3. اذهب إلى /dashboard/users
4. يجب أن ترى جميع المستخدمين! ✅

---

## إذا لم يعمل

### تطبيق Migration الكاملة

انسخ المحتوى من الملف:
`supabase/migrations/20251028000000_fix_admin_users_access.sql`

وألصقه في SQL Editor واضغط Run.

---

## الملفات التي تم تحديثها

1. ✅ `app/dashboard/users/page.tsx` - يستخدم الآن `get_all_profiles()`
2. ✅ `supabase/migrations/20251028000000_fix_admin_users_access.sql` - Migration جديد

---

## ملاحظات

- الـ Admin فقط يمكنه رؤية جميع المستخدمين
- المستخدمون الآخرون يرون فقط ملفاتهم الشخصية
- الأمان محفوظ 100%

