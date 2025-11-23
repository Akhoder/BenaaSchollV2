# 🔧 إصلاح أخطاء البناء على bolt.new و GitHub

## 🔍 المشاكل الشائعة

### 1. ❌ `output: 'export'` في CI/CD Settings

**المشكلة**: 
- bolt.new أو GitHub Actions قد يكون لديه `output: 'export'` في الإعدادات
- هذا غير متوافق مع Supabase Auth و Server-side features

**الحل**:

#### لـ bolt.new:
1. اذهب إلى Project Settings
2. ابحث عن "Build Settings" أو "Next.js Config"
3. تأكد من عدم وجود `output: 'export'`
4. إذا كان موجوداً، احذفه

#### لـ GitHub Actions:
تحقق من ملف `.github/workflows/*.yml`:

```yaml
# ❌ خطأ
- name: Build
  run: npm run build
  env:
    NEXT_PUBLIC_OUTPUT: export  # احذف هذا

# ✅ صحيح
- name: Build
  run: npm run build
```

---

### 2. ❌ متغيرات البيئة مفقودة

**المشكلة**: 
- `NEXT_PUBLIC_SUPABASE_URL` غير موجود
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` غير موجود

**الحل**:

#### لـ bolt.new:
1. اذهب إلى Project Settings → Environment Variables
2. أضف:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

#### لـ GitHub Actions:
في `.github/workflows/*.yml`:

```yaml
- name: Build
  run: npm run build
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

**في GitHub Secrets**:
1. Settings → Secrets and variables → Actions
2. أضف:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### 3. ❌ TypeScript Errors

**المشكلة**: 
- أخطاء TypeScript تمنع البناء

**الحل**:

#### إضافة `tsconfig.json` للتحقق:

```json
{
  "compilerOptions": {
    "skipLibCheck": true,  // تخطي فحص مكتبات node_modules
    "noEmit": true
  }
}
```

#### أو في `next.config.js`:

```javascript
typescript: {
  ignoreBuildErrors: false,  // لا تتجاهل الأخطاء
},
```

---

### 4. ❌ ESLint Errors

**المشكلة**: 
- أخطاء ESLint تمنع البناء

**الحل**:

في `next.config.js` (موجود بالفعل ✅):

```javascript
eslint: {
  ignoreDuringBuilds: true,  // ✅ موجود
},
```

---

### 5. ❌ Image Optimization Issues

**المشكلة**: 
- مشاكل في تحسين الصور

**الحل**:

في `next.config.js` (موجود بالفعل ✅):

```javascript
images: { 
  unoptimized: false,  // ✅ صحيح
  formats: ['image/webp', 'image/avif'],
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**.supabase.co',
      pathname: '/storage/v1/object/public/**',
    },
  ],
},
```

**ملاحظة**: على bolt.new، قد تحتاج إلى:
```javascript
images: { 
  unoptimized: true,  // إذا فشل البناء
},
```

---

### 6. ❌ Node.js Version

**المشكلة**: 
- إصدار Node.js غير متوافق

**الحل**:

#### إنشاء `.nvmrc`:
```
20.19.5
```

#### أو في `package.json`:
```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

#### لـ GitHub Actions:
```yaml
- uses: actions/setup-node@v3
  with:
    node-version: '20'
```

---

## 🔧 الحلول السريعة

### الحل 1: إضافة ملف `.boltignore` (لـ bolt.new)

إنشاء ملف `.boltignore`:

```
.next
node_modules
.env.local
.env*.local
```

---

### الحل 2: إضافة ملف `.github/workflows/build.yml`

إنشاء `.github/workflows/build.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
      env:
        NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
    
    - name: Check build
      run: |
        if [ ! -d ".next" ]; then
          echo "Build failed - .next directory not found"
          exit 1
        fi
```

---

### الحل 3: تحديث `next.config.js` للتوافق

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ تأكد من عدم وجود output: 'export'
  // output: 'export',  // ❌ لا تستخدم هذا
  
  // ✅ ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // ✅ TypeScript
  typescript: {
    ignoreBuildErrors: false,  // تحذير: لا تتجاهل الأخطاء
  },
  
  // ✅ Images
  images: {
    unoptimized: process.env.NODE_ENV === 'production' ? false : false,
    // على bolt.new، قد تحتاج: unoptimized: true
  },
  
  // ✅ Webpack
  webpack: (config, { isServer }) => {
    config.ignoreWarnings = [
      { module: /node_modules\/@supabase/ },
    ];
    return config;
  },
  
  // ✅ Compression
  compress: true,
  
  // ✅ Performance
  poweredByHeader: false,
  reactStrictMode: true,
};

module.exports = nextConfig;
```

---

## 📋 Checklist للإصلاح

### لـ bolt.new:
- [ ] تحقق من عدم وجود `output: 'export'` في Settings
- [ ] أضف متغيرات البيئة (Supabase URL & Key)
- [ ] تحقق من إصدار Node.js (20+)
- [ ] جرب `images: { unoptimized: true }` إذا فشل البناء
- [ ] تحقق من Logs في bolt.new dashboard

### لـ GitHub Actions:
- [ ] أنشئ `.github/workflows/build.yml`
- [ ] أضف Secrets في GitHub Settings
- [ ] تحقق من إصدار Node.js في workflow
- [ ] تأكد من متغيرات البيئة
- [ ] تحقق من Build logs

---

## 🐛 استكشاف الأخطاء

### خطأ: "Cannot find module"

**الحل**:
```bash
# في CI/CD
npm ci  # بدلاً من npm install
```

### خطأ: "Module not found: Can't resolve"

**الحل**:
- تحقق من أن جميع الملفات موجودة
- تحقق من imports
- تأكد من عدم وجود ملفات محذوفة

### خطأ: "Type error"

**الحل**:
```bash
# محلياً
npm run typecheck

# أصلح الأخطاء قبل الـ push
```

### خطأ: "Build failed"

**الحل**:
1. تحقق من Logs
2. ابحث عن الخطأ المحدد
3. طبق الحل المناسب من القائمة أعلاه

---

## 🎯 الحل السريع (Quick Fix)

### 1. تحديث `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ تأكد من عدم وجود output: 'export'
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    // لا تتجاهل الأخطاء - أصلحها
    ignoreBuildErrors: false,
  },
  
  images: {
    // جرب true إذا فشل البناء على bolt.new
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  
  webpack: (config) => {
    config.ignoreWarnings = [
      { module: /node_modules\/@supabase/ },
    ];
    return config;
  },
  
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
};

module.exports = nextConfig;
```

### 2. إنشاء `.nvmrc`:

```
20.19.5
```

### 3. إضافة `package.json` engines:

```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

---

## 📝 الخطوات التالية

1. **حدد الخطأ المحدد** من Logs
2. **طبق الحل المناسب** من القائمة
3. **اختبر محلياً** أولاً:
   ```bash
   npm run build
   ```
4. **Push التغييرات** واختبر على bolt.new/GitHub

---

## 💡 نصائح

- ✅ دائماً اختبر `npm run build` محلياً قبل الـ push
- ✅ تحقق من Logs في bolt.new/GitHub
- ✅ تأكد من متغيرات البيئة
- ✅ لا تستخدم `output: 'export'` مع Supabase
- ✅ استخدم `npm ci` في CI/CD

---

**إذا استمرت المشكلة**: شارك Logs المحددة وسأساعدك في حلها!

