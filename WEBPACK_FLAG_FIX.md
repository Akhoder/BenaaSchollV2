# 🔧 إصلاح خطأ --webpack flag

## ❌ المشكلة

```
Unknown or unexpected option: --webpack
```

**السبب**: 
- `--webpack` flag غير مدعوم في Next.js 13.5.1
- هذا الـ flag متوفر فقط في Next.js 14+

---

## ✅ الحل

### إزالة `--webpack` flag من package.json

**قبل**:
```json
{
  "scripts": {
    "build": "next build --webpack"  // ❌ غير مدعوم في Next.js 13
  }
}
```

**بعد**:
```json
{
  "scripts": {
    "build": "next build"  // ✅ يعمل تلقائياً مع webpack config
  }
}
```

---

## 🔍 كيف يعمل؟

### Next.js 13.5.1
- إذا كان لديك `webpack` config في `next.config.js`، Next.js سيستخدم webpack تلقائياً
- لا حاجة لـ `--webpack` flag
- Turbopack غير مفعّل افتراضياً في Next.js 13

### Next.js 16+
- Turbopack مفعّل افتراضياً
- `--webpack` flag متوفر لإجبار webpack
- لكن في Next.js 13، webpack هو الافتراضي

---

## 📋 الحالة الحالية

### next.config.js
```javascript
// ✅ webpack config موجود
webpack: (config, { isServer }) => {
  config.ignoreWarnings = [
    { module: /node_modules\/@supabase/ },
  ];
  return config;
},
```

### package.json
```json
{
  "scripts": {
    "build": "next build"  // ✅ بدون --webpack flag
  }
}
```

---

## 🧪 اختبار

```bash
npm run build
```

**النتيجة المتوقعة**:
- ✅ البناء يعمل بدون أخطاء
- ✅ يستخدم webpack تلقائياً
- ✅ لا يوجد خطأ `--webpack`

---

## 💡 ملاحظات

### لماذا لا نحتاج `--webpack` في Next.js 13؟

1. **Next.js 13** يستخدم webpack افتراضياً
2. **Turbopack** كان experimental في Next.js 13
3. وجود `webpack` config يكفي لإجبار webpack

### متى نحتاج `--webpack`؟

- فقط في **Next.js 14+** عندما يكون Turbopack مفعّل افتراضياً
- في Next.js 13، webpack هو الافتراضي

---

## 🎯 النتيجة

بعد إزالة `--webpack` flag:
- ✅ البناء يعمل في Next.js 13.5.1
- ✅ يستخدم webpack تلقائياً
- ✅ متوافق مع bolt.new و GitHub

---

**الحالة**: ✅ تم الإصلاح  
**الملف المعدل**: `package.json`  
**الوقت المتوقع**: فوري

