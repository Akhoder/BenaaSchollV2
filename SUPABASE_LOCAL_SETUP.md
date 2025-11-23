# 🚀 إعداد Supabase محلياً (Local Setup)

## 📋 المتطلبات الأساسية

### 1. تثبيت Docker Desktop
Supabase محلياً يعمل على Docker، لذلك تحتاج:

- **Windows**: [تحميل Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Mac**: [تحميل Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux**: اتبع [دليل Docker](https://docs.docker.com/engine/install/)

**تحقق من التثبيت**:
```bash
docker --version
docker-compose --version
```

---

## 🔧 الخطوة 1: تثبيت Supabase CLI

### Windows (PowerShell)
```powershell
# باستخدام Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# أو باستخدام npm
npm install -g supabase
```

### Mac/Linux
```bash
# باستخدام Homebrew
brew install supabase/tap/supabase

# أو باستخدام npm
npm install -g supabase
```

**تحقق من التثبيت**:
```bash
supabase --version
```

---

## 🎯 الخطوة 2: تهيئة المشروع

### في مجلد المشروع
```bash
cd E:\Data\BenaaSchoolV2\BenaaSchollV2

# تهيئة Supabase محلياً
supabase init
```

**ملاحظة**: إذا كان لديك مجلد `supabase/` بالفعل، قد يطلب منك التأكيد.

---

## 🚀 الخطوة 3: تشغيل Supabase محلياً

### ابدأ Supabase
```bash
supabase start
```

**الوقت المتوقع**: 2-5 دقائق (أول مرة)

**ما يحدث**:
- ✅ تحميل Docker images
- ✅ إنشاء PostgreSQL database
- ✅ تشغيل Supabase services
- ✅ إنشاء API keys

**النتيجة**:
```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🔑 الخطوة 4: تحديث متغيرات البيئة

### إنشاء ملف `.env.local`

```bash
# في مجلد المشروع
# إنشاء ملف .env.local
```

**محتوى `.env.local`**:
```env
# Supabase Local Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # من supabase start

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3005
```

**ملاحظة**: 
- استخدم `anon key` من نتيجة `supabase start`
- لا تضع `service_role key` في `.env.local` (للمشاريع المحلية فقط)

---

## 📊 الخطوة 5: تطبيق Migrations

### تطبيق جميع Migrations
```bash
# تطبيق migrations الموجودة
supabase db reset
```

**أو تطبيق migrations يدوياً**:
```bash
supabase migration up
```

**التحقق**:
```bash
# عرض حالة migrations
supabase migration list
```

---

## 🎨 الخطوة 6: فتح Supabase Studio

### الوصول إلى Studio
```bash
# افتح المتصفح على
http://localhost:54323
```

**ما يمكنك فعله في Studio**:
- ✅ عرض الجداول (Tables)
- ✅ إدارة البيانات (Data)
- ✅ تشغيل SQL queries
- ✅ إدارة Authentication
- ✅ إدارة Storage
- ✅ عرض Logs

---

## 🧪 الخطوة 7: اختبار الاتصال

### تحديث `lib/supabase.ts` (اختياري)

إذا كنت تريد استخدام متغيرات البيئة المحلية:

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-local-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### تشغيل التطبيق
```bash
npm run dev
```

**التحقق**:
- افتح `http://localhost:3005`
- جرب تسجيل الدخول
- تحقق من البيانات في Studio

---

## 📝 الأوامر المفيدة

### إدارة Supabase محلياً

```bash
# بدء Supabase
supabase start

# إيقاف Supabase
supabase stop

# إعادة تشغيل Supabase
supabase restart

# عرض الحالة
supabase status

# عرض Logs
supabase logs

# إعادة تعيين Database (يحذف جميع البيانات)
supabase db reset

# إنشاء migration جديد
supabase migration new migration_name

# تطبيق migrations
supabase migration up

# التراجع عن migration
supabase migration down
```

---

## 🔍 استكشاف الأخطاء

### مشكلة: Docker لا يعمل

**الحل**:
1. تأكد من تشغيل Docker Desktop
2. انتظر حتى يبدأ Docker بالكامل
3. أعد المحاولة

### مشكلة: Port مستخدم

**الحل**:
```bash
# إيقاف Supabase
supabase stop

# تغيير Ports في supabase/config.toml
# ثم أعد التشغيل
supabase start
```

### مشكلة: Migrations فشلت

**الحل**:
```bash
# إعادة تعيين Database
supabase db reset

# أو تطبيق migrations يدوياً
supabase migration up
```

### مشكلة: لا يمكن الاتصال بـ Supabase

**الحل**:
1. تحقق من `supabase status`
2. تأكد من أن Docker يعمل
3. تحقق من `.env.local`
4. أعد تشغيل `supabase start`

---

## 📊 مقارنة: محلي vs Cloud

| الميزة | محلي (Local) | Cloud |
|--------|--------------|-------|
| **السرعة** | سريع جداً | يعتمد على الاتصال |
| **التكلفة** | مجاني | حسب الاستخدام |
| **البيانات** | محلية فقط | في السحابة |
| **النسخ الاحتياطي** | يدوي | تلقائي |
| **الوصول** | محلي فقط | من أي مكان |
| **التطوير** | مثالي | جيد |
| **الإنتاج** | ❌ | ✅ |

---

## 🎯 سيناريوهات الاستخدام

### للتطوير المحلي
```bash
# استخدم Supabase محلياً
supabase start
# استخدم .env.local
```

### للاختبار
```bash
# استخدم Supabase Cloud (staging)
# استخدم .env.staging
```

### للإنتاج
```bash
# استخدم Supabase Cloud (production)
# استخدم .env.production
```

---

## 📁 هيكل الملفات

بعد `supabase init`:

```
BenaaSchollV2/
├── supabase/
│   ├── config.toml          # إعدادات Supabase
│   ├── migrations/          # Migrations موجودة ✅
│   │   ├── 20251027193030_fix_profile_creation_trigger.sql
│   │   └── ...
│   ├── seed.sql            # بيانات تجريبية (اختياري)
│   └── functions/          # Edge Functions (اختياري)
├── .env.local              # متغيرات البيئة المحلية
└── ...
```

---

## ✅ Checklist

- [ ] تثبيت Docker Desktop
- [ ] تثبيت Supabase CLI
- [ ] تشغيل `supabase init`
- [ ] تشغيل `supabase start`
- [ ] نسخ API keys
- [ ] إنشاء `.env.local`
- [ ] تطبيق migrations (`supabase db reset`)
- [ ] فتح Studio (`http://localhost:54323`)
- [ ] اختبار الاتصال
- [ ] تشغيل التطبيق (`npm run dev`)

---

## 🎊 النتيجة النهائية

بعد إكمال جميع الخطوات:

- ✅ Supabase يعمل محلياً
- ✅ Database جاهز مع جميع الجداول
- ✅ يمكنك التطوير بدون اتصال بالإنترنت
- ✅ Studio متاح على `http://localhost:54323`
- ✅ التطبيق متصل بـ Supabase محلي

---

## 💡 نصائح إضافية

### 1. حفظ البيانات
```bash
# تصدير البيانات
supabase db dump -f backup.sql

# استيراد البيانات
supabase db load backup.sql
```

### 2. Seed Data
```bash
# إنشاء ملف supabase/seed.sql
# ثم تشغيل
supabase db reset  # يطبق migrations + seed
```

### 3. إدارة Storage
- افتح Studio → Storage
- أنشئ Buckets
- رفع الملفات

### 4. Authentication
- افتح Studio → Authentication
- إدارة المستخدمين
- اختبار تسجيل الدخول

---

## 🚀 الخطوة التالية

بعد إعداد Supabase محلياً:

1. ✅ تطوير الميزات الجديدة
2. ✅ اختبار التغييرات
3. ✅ تطبيق migrations جديدة
4. ✅ اختبار Authentication
5. ✅ اختبار Database queries

---

**الوقت المتوقع**: 10-15 دقيقة (أول مرة)  
**الصعوبة**: متوسطة  
**النتيجة**: بيئة تطوير محلية كاملة! 🎉

