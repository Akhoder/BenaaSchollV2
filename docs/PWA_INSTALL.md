# دليل تثبيت PWA - Progressive Web App

## الميزات المضافة

تم إضافة دعم كامل لتثبيت التطبيق كـ PWA على جميع أنواع الأجهزة:

### ✅ الميزات المتوفرة:

1. **Service Worker** - يعمل بالفعل في المشروع
2. **Web App Manifest** - محدث ومحسّن
3. **Install Prompt** - رسالة تثبيت ذكية مع تعليمات لكل نوع جهاز
4. **دعم iOS** - تعليمات خاصة لتثبيت على iPhone/iPad
5. **دعم Android** - دعم كامل لتثبيت على Android/Chrome

## كيفية العمل

### للمستخدمين على Android/Chrome:

1. عند زيارة الموقع، ستظهر رسالة تثبيت تلقائياً بعد 3 ثوانٍ
2. يمكن الضغط على "تثبيت الآن" لتثبيت التطبيق مباشرة
3. أو يمكن تثبيت التطبيق من قائمة المتصفح:
   - Chrome: القائمة → "تثبيت التطبيق"
   - Samsung Internet: القائمة → "إضافة إلى الشاشة الرئيسية"

### للمستخدمين على iOS (iPhone/iPad):

1. ستظهر رسالة مع تعليمات خطوة بخطوة
2. اضغط على زر المشاركة (Share) في أسفل الشاشة
3. اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen)
4. اضغط "إضافة" (Add)

## الملفات المضافة/المحدثة

- `hooks/useInstallPrompt.ts` - Hook للتعامل مع أحداث التثبيت
- `components/InstallPrompt.tsx` - مكون رسالة التثبيت
- `public/manifest.json` - محدث مع أيقونات إضافية
- `app/layout.tsx` - تم إضافة مكون InstallPrompt

## ملاحظات مهمة

1. **الأيقونات**: حالياً يستخدم التطبيق الأيقونات الموجودة (144x144 و 192x192)
   - للحصول على أفضل تجربة، يُنصح بإضافة أيقونات بأحجام: 72x72, 96x96, 128x128, 152x152, 384x384, 512x512
   - يمكن استخدام أدوات مثل [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator) لإنشاء الأيقونات

2. **Service Worker**: يعمل فقط في وضع الإنتاج (Production)
   - في وضع التطوير، يتم تعطيل Service Worker تلقائياً

3. **رسالة التثبيت**: 
   - تظهر تلقائياً بعد 3 ثوانٍ من تحميل الصفحة
   - يمكن للمستخدم إخفاؤها، وستظهر مرة أخرى بعد أسبوع
   - لا تظهر إذا كان التطبيق مثبتاً بالفعل

## الاختبار

لاختبار PWA:

1. **Chrome DevTools**:
   - افتح DevTools → Application → Manifest
   - تحقق من Manifest و Service Worker

2. **Lighthouse**:
   - افتح DevTools → Lighthouse
   - اختبر PWA Score

3. **الاختبار على الأجهزة**:
   - Android: افتح الموقع في Chrome واختبر التثبيت
   - iOS: افتح الموقع في Safari واختبر "إضافة إلى الشاشة الرئيسية"

## الدعم

- ✅ Android (Chrome, Samsung Internet, Firefox)
- ✅ iOS (Safari)
- ✅ Desktop (Chrome, Edge, Opera)


