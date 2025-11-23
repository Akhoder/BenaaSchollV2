# 🔧 تثبيت Supabase CLI على Windows

## ❌ المشكلة

`npm install -g supabase` **غير مدعوم** على Windows.

الخطأ:
```
Installing Supabase CLI as a global module is not supported.
Please use one of the supported package managers
```

---

## ✅ الحلول المدعومة على Windows

### الطريقة 1: استخدام Scoop (موصى به) ⭐

#### الخطوة 1: تثبيت Scoop (إذا لم يكن مثبتاً)

```powershell
# فتح PowerShell كـ Administrator
# تشغيل:
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

#### الخطوة 2: إضافة Supabase bucket

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
```

#### الخطوة 3: تثبيت Supabase CLI

```powershell
scoop install supabase
```

#### التحقق من التثبيت

```powershell
supabase --version
```

---

### الطريقة 2: استخدام Chocolatey

#### الخطوة 1: تثبيت Chocolatey (إذا لم يكن مثبتاً)

```powershell
# فتح PowerShell كـ Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

#### الخطوة 2: تثبيت Supabase CLI

```powershell
choco install supabase
```

#### التحقق من التثبيت

```powershell
supabase --version
```

---

### الطريقة 3: التحميل المباشر (Manual)

#### الخطوة 1: تحميل Binary

1. اذهب إلى: https://github.com/supabase/cli/releases
2. حمّل `supabase_windows_amd64.zip` (أو النسخة المناسبة)
3. استخرج الملفات

#### الخطوة 2: إضافة إلى PATH

1. انسخ مسار المجلد المستخرج (مثلاً: `C:\supabase`)
2. افتح "Environment Variables":
   - اضغط `Win + R`
   - اكتب `sysdm.cpl` واضغط Enter
   - تبويب "Advanced" → "Environment Variables"
3. في "System variables"، ابحث عن `Path` واختر "Edit"
4. اضغط "New" وأضف المسار (مثلاً: `C:\supabase`)
5. اضغط OK في جميع النوافذ

#### التحقق من التثبيت

```powershell
# أغلق PowerShell وأعد فتحه
supabase --version
```

---

### الطريقة 4: استخدام npx (بدون تثبيت)

يمكنك استخدام Supabase CLI بدون تثبيت:

```powershell
# استخدام npx
npx supabase@latest --version

# أو استخدام مباشرة
npx supabase@latest start
npx supabase@latest init
```

**ملاحظة**: هذه الطريقة أبطأ قليلاً لأنها تحمّل CLI في كل مرة.

---

## 🎯 الطريقة الموصى بها

### للاستخدام اليومي: **Scoop** ⭐

**لماذا Scoop؟**
- ✅ سهل التثبيت
- ✅ تحديثات تلقائية
- ✅ إدارة أفضل للحزم
- ✅ مدعوم رسمياً من Supabase

---

## 📋 خطوات سريعة (Scoop)

```powershell
# 1. تثبيت Scoop (إذا لم يكن مثبتاً)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# 2. إضافة Supabase bucket
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git

# 3. تثبيت Supabase CLI
scoop install supabase

# 4. التحقق
supabase --version
```

---

## 🔍 التحقق من التثبيت

بعد التثبيت بأي طريقة:

```powershell
# التحقق من الإصدار
supabase --version

# عرض المساعدة
supabase --help

# عرض الأوامر المتاحة
supabase
```

---

## 🚀 بعد التثبيت

### الخطوة 1: تهيئة المشروع

```powershell
cd E:\Data\BenaaSchoolV2\BenaaSchollV2
supabase init
```

### الخطوة 2: تشغيل Supabase

```powershell
supabase start
```

**ملاحظة**: تأكد من تشغيل Docker Desktop أولاً!

---

## 🛠️ استكشاف الأخطاء

### مشكلة: Scoop غير مثبت

**الحل**:
```powershell
# تثبيت Scoop
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

### مشكلة: Docker غير يعمل

**الحل**:
1. تأكد من تثبيت Docker Desktop
2. شغّل Docker Desktop
3. انتظر حتى يبدأ بالكامل
4. أعد المحاولة

### مشكلة: PATH غير محدث

**الحل**:
1. أغلق PowerShell بالكامل
2. افتح PowerShell جديد
3. جرب `supabase --version` مرة أخرى

---

## 📊 مقارنة الطرق

| الطريقة | السهولة | السرعة | التحديثات | الموصى به |
|---------|---------|--------|-----------|----------|
| **Scoop** | ⭐⭐⭐ | ⭐⭐⭐ | تلقائية | ✅ نعم |
| **Chocolatey** | ⭐⭐ | ⭐⭐⭐ | تلقائية | ✅ نعم |
| **Manual** | ⭐ | ⭐⭐ | يدوية | ⚠️ إذا فشلت الأخرى |
| **npx** | ⭐⭐⭐ | ⭐ | - | ⚠️ للتجربة فقط |

---

## ✅ Checklist

- [ ] تثبيت Docker Desktop
- [ ] اختيار طريقة التثبيت (Scoop موصى به)
- [ ] تثبيت Supabase CLI
- [ ] التحقق من التثبيت (`supabase --version`)
- [ ] تهيئة المشروع (`supabase init`)
- [ ] تشغيل Supabase (`supabase start`)

---

## 🎊 النتيجة

بعد التثبيت الناجح:

```powershell
supabase --version
# يجب أن يعرض: supabase version X.X.X
```

---

**الطريقة الموصى بها**: Scoop ⭐  
**الوقت المتوقع**: 5-10 دقائق  
**الصعوبة**: سهلة

