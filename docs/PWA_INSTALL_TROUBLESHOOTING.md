# استكشاف أخطاء تثبيت PWA - Troubleshooting PWA Installation

## لماذا لا يظهر التثبيت التلقائي؟

### الأسباب المحتملة:

#### 1. **وضع التطوير (Development Mode)**
   - **المشكلة**: Service Worker معطل في وضع التطوير (`process.env.NODE_ENV === 'development'`)
   - **السبب**: Chrome لا يطلق `beforeinstallprompt` event بدون Service Worker مسجل
   - **الحل**: 
     - اختبر على بيئة الإنتاج (Production)
     - أو استخدم `npm run build && npm start` للاختبار محلياً

#### 2. **Service Worker غير مسجل**
   - **المشكلة**: Service Worker لم يتم تسجيله بنجاح
   - **التحقق**: افتح Console وابحث عن `[SW] Service Worker registered successfully`
   - **الحل**: 
     - تأكد من وجود `/public/sw.js`
     - تأكد من أن Service Worker Provider يعمل
     - تحقق من Console للأخطاء

#### 3. **التطبيق مثبت بالفعل**
   - **المشكلة**: التطبيق مثبت على الجهاز
   - **التحقق**: 
     - افتح Console وابحث عن `isStandalone: true` أو `isInstalled: true`
   - **الحل**: 
     - احذف التطبيق من الجهاز
     - أو اختبر على جهاز/متصفح آخر

#### 4. **المستخدم رفض التثبيت من قبل**
   - **المشكلة**: Chrome يتذكر رفض المستخدم ولا يظهر prompt مرة أخرى
   - **الحل**: 
     - امسح بيانات المتصفح (Cache & Cookies)
     - أو استخدم وضع التصفح الخفي (Incognito)
     - أو استخدم متصفح آخر

#### 5. **المتصفح لا يدعم PWA**
   - **المشكلة**: المتصفح لا يدعم تثبيت PWA
   - **المتصفحات المدعومة**:
     - ✅ Chrome (Android & Desktop)
     - ✅ Edge (Android & Desktop)
     - ✅ Samsung Internet
     - ✅ Firefox (Android) - محدود
     - ❌ Safari (iOS) - لا يدعم `beforeinstallprompt` (يستخدم تعليمات يدوية)

#### 6. **HTTPS غير متوفر (في الإنتاج)**
   - **المشكلة**: PWA يتطلب HTTPS في الإنتاج
   - **الاستثناء**: `localhost` يعمل بدون HTTPS
   - **الحل**: 
     - استخدم HTTPS في الإنتاج
     - أو اختبر على `localhost`

#### 7. **Manifest.json به أخطاء**
   - **المشكلة**: Manifest غير صالح أو به أخطاء
   - **التحقق**: 
     - افتح `/manifest.json` في المتصفح
     - استخدم [Manifest Validator](https://manifest-validator.appspot.com/)
   - **الحل**: 
     - تأكد من صحة JSON
     - تأكد من وجود جميع الحقول المطلوبة

#### 8. **الأيقونات مفقودة أو غير صحيحة**
   - **المشكلة**: Manifest يشير إلى أيقونات غير موجودة
   - **المتطلبات**:
     - ✅ أيقونة 192x192 (مطلوبة)
     - ✅ أيقونة 512x512 (مطلوبة)
   - **الحل**: 
     - تأكد من وجود الأيقونات في `/public/icons/`
     - تأكد من أن المسارات في manifest صحيحة

## كيفية التشخيص

### 1. افتح Developer Console (F12)

### 2. ابحث عن رسائل `[PWA Diagnostics]`:
```
[PWA Diagnostics] Environment check: {...}
[PWA Diagnostics] Service Worker registrations: X
[PWA Diagnostics] ✅ Manifest found: {...}
```

### 3. ابحث عن رسائل `[PWA Install Hook]`:
```
[PWA Install Hook] ✅ beforeinstallprompt event received
[PWA Install Hook] ⚠️ No deferred prompt available
```

### 4. تحقق من Service Worker:
```javascript
// في Console
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs.length);
});
```

### 5. تحقق من Manifest:
```javascript
// في Console
fetch('/manifest.json').then(r => r.json()).then(console.log);
```

## الحلول السريعة

### للاختبار في وضع التطوير:
1. استخدم `npm run build && npm start`
2. أو اختبر على بيئة الإنتاج

### لإعادة تعيين حالة التثبيت:
1. افتح Chrome DevTools
2. اذهب إلى Application → Service Workers
3. اضغط "Unregister" على جميع Service Workers
4. اذهب إلى Application → Storage
5. اضغط "Clear site data"
6. أعد تحميل الصفحة

### للتثبيت اليدوي:
1. **Chrome Desktop**: القائمة (⋮) → "Install app"
2. **Chrome Android**: القائمة (⋮) → "Install app" أو "Add to Home screen"
3. **Samsung Internet**: القائمة → "Add to Home screen"
4. **iOS Safari**: زر المشاركة (Share) → "Add to Home Screen"

## ملاحظات مهمة

- `beforeinstallprompt` event يحدث **مرة واحدة فقط** في كل جلسة
- إذا تم رفض التثبيت، قد لا يظهر event مرة أخرى حتى يتم مسح بيانات المتصفح
- Service Worker **مطلوب** لتشغيل `beforeinstallprompt` (ما عدا iOS)
- في وضع التطوير، Service Worker معطل تلقائياً لتجنب مشاكل البناء

## الدعم

إذا استمرت المشكلة بعد تجربة جميع الحلول:
1. افتح Console وأرسل جميع رسائل `[PWA Diagnostics]`
2. تحقق من Service Worker registrations
3. تحقق من Manifest validation
4. تأكد من أنك تستخدم HTTPS في الإنتاج
