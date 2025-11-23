# دليل النشر الكامل - مدرسة البناء العلمي

## 🚀 خطوات النشر

### 1️⃣ الإعداد المسبق

قبل النشر، تأكد من:
- ✅ Build يعمل محلياً: `npm run build`
- ✅ TypeScript بدون أخطاء: `npm run typecheck`
- ✅ متغيرات البيئة موجودة في `.env`

### 2️⃣ النشر على Vercel (الطريقة الموصى بها)

#### الطريقة الأولى: من خلال موقع Vercel

1. **إنشاء حساب على Vercel**
   - اذهب إلى: https://vercel.com
   - سجل دخول باستخدام GitHub

2. **ربط المشروع**
   - اضغط على "New Project"
   - اختر repository الخاص بك
   - اضغط "Import"

3. **إعداد المتغيرات**
   في صفحة الإعدادات، أضف:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tenxnwdbgunmnnqldrve.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **النشر**
   - اضغط "Deploy"
   - انتظر حتى ينتهي Build (2-3 دقائق)

#### الطريقة الثانية: من خلال CLI

```bash
# تثبيت Vercel CLI
npm install -g vercel

# تسجيل الدخول
vercel login

# النشر
vercel

# أو للنشر المباشر للإنتاج
vercel --prod
```

### 3️⃣ النشر على Netlify

#### من خلال موقع Netlify

1. **إنشاء حساب**
   - اذهب إلى: https://netlify.com
   - سجل دخول باستخدام GitHub

2. **ربط المشروع**
   - اضغط "Add new site" → "Import an existing project"
   - اختر GitHub واختر repository
   - ستكتشف Netlify تلقائياً أنه مشروع Next.js

3. **إعداد Build**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - الإعدادات موجودة في `netlify.toml`

4. **إضافة Environment Variables**
   في Settings → Environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

5. **النشر**
   - اضغط "Deploy site"

#### من خلال CLI

```bash
# تثبيت Netlify CLI
npm install -g netlify-cli

# تسجيل الدخول
netlify login

# ربط المشروع
netlify init

# النشر
netlify deploy --prod
```

### 4️⃣ النشر على Railway

1. **إنشاء حساب على Railway**
   - اذهب إلى: https://railway.app
   - سجل دخول باستخدام GitHub

2. **إنشاء مشروع جديد**
   - اضغط "New Project"
   - اختر "Deploy from GitHub repo"
   - اختر repository

3. **إعداد المتغيرات**
   في Variables tab:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

4. **إعداد Build**
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - سيتم اكتشاف Port تلقائياً

### 5️⃣ النشر على Render

1. **إنشاء حساب**
   - اذهب إلى: https://render.com
   - سجل دخول باستخدام GitHub

2. **إنشاء Web Service**
   - اضغط "New +" → "Web Service"
   - اختر repository

3. **الإعدادات**
   ```
   Name: madrasat-albinaa
   Environment: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

4. **Environment Variables**
   أضف المتغيرات المطلوبة

---

## ❗ حل المشاكل الشائعة

### مشكلة: "Failed to publish"

**الحل 1: تحقق من متغيرات البيئة**
```bash
# تأكد من وجود المتغيرات في منصة النشر
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**الحل 2: تحقق من Node.js version**
```json
// في package.json
"engines": {
  "node": ">=18.0.0",
  "npm": ">=9.0.0"
}
```
تأكد أن منصة النشر تستخدم Node 18 أو أحدث.

**الحل 3: نظف الـ cache**
في Vercel:
- اذهب إلى Settings → General
- اضغط "Clear Cache and Redeploy"

في Netlify:
- في Deploys tab
- اضغط "Trigger deploy" → "Clear cache and deploy site"

**الحل 4: تحقق من الـ Build logs**
افتح Build logs وابحث عن:
- أخطاء TypeScript
- أخطاء في التبعيات (dependencies)
- أخطاء في Supabase connection

### مشكلة: "Module not found"

```bash
# حذف node_modules وإعادة التثبيت
rm -rf node_modules package-lock.json
npm install

# ثم جرب Build مرة أخرى
npm run build
```

### مشكلة: "Image Optimization Error"

الحل: تم تكوين Next.js لدعم Image Optimization على Vercel/Netlify تلقائياً.

إذا كنت تستخدم منصة أخرى، غير في `next.config.js`:
```javascript
images: {
  unoptimized: true, // لتعطيل Image Optimization
}
```

### مشكلة: "API Routes not working"

تأكد من:
1. منصة النشر تدعم Serverless Functions
2. API routes موجودة في `app/api/`
3. متغيرات البيئة صحيحة

### مشكلة: "Supabase Connection Failed"

```bash
# تحقق من صحة الـ credentials
# في terminal محلي:
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)"
```

تأكد من أن القيم صحيحة في منصة النشر.

---

## 📋 Checklist قبل النشر

- [ ] ✅ `npm run build` يعمل بدون أخطاء
- [ ] ✅ `npm run typecheck` بدون أخطاء
- [ ] ✅ متغيرات البيئة موجودة
- [ ] ✅ Supabase يعمل محلياً
- [ ] ✅ جميع الصفحات تحمل بدون أخطاء
- [ ] ✅ API routes تعمل
- [ ] ✅ Authentication يعمل
- [ ] ✅ Database queries تعمل
- [ ] ✅ File uploads تعمل (إذا كانت موجودة)

---

## 🔒 الأمان

**لا تنسَ:**
1. أضف `.env` إلى `.gitignore` (موجود بالفعل)
2. لا ترفع credentials على GitHub
3. استخدم Secrets في منصة النشر
4. فعّل Two-Factor Authentication

---

## 📊 بعد النشر

### مراقبة الأداء
- استخدم Vercel Analytics
- راقب Supabase Usage في Dashboard
- تحقق من Error logs بانتظام

### التحديثات
```bash
# كل push إلى main سيؤدي لنشر تلقائي
git add .
git commit -m "تحديث التطبيق"
git push origin main
```

---

## 📞 الدعم

إذا واجهت مشاكل:
1. افتح Build logs في منصة النشر
2. انسخ رسالة الخطأ كاملة
3. ابحث في الحلول أعلاه
4. تحقق من إعدادات Supabase

---

## ✅ الملفات المهمة للنشر

تم إنشاء الملفات التالية لتسهيل النشر:

1. **vercel.json** - إعدادات Vercel
2. **netlify.toml** - إعدادات Netlify
3. **.env.example** - مثال لمتغيرات البيئة
4. **.github/workflows/build.yml** - GitHub Actions CI/CD
5. **next.config.js** - إعدادات Next.js محسّنة

---

## 🎉 النشر الناجح!

بعد النشر الناجح:
- ✅ التطبيق متاح على: `https://your-app.vercel.app`
- ✅ Auto-deploy فعال: كل push → نشر تلقائي
- ✅ HTTPS مفعل تلقائياً
- ✅ CDN عالمي لسرعة فائقة

**مبروك! تطبيقك الآن على الإنترنت! 🚀**
