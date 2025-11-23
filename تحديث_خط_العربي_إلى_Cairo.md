# ✅ تحديث خط العربي إلى Cairo في كل النظام

## 📋 ملخص التحديثات

تم تحديث جميع استخدامات الخطوط العربية في النظام لاستخدام **Cairo** فقط بدلاً من Almarai و Tajawal.

---

## 🎨 التحديثات المطبقة

### 1. ✅ `app/globals.css`

#### إضافة قواعد CSS لتطبيق Cairo على جميع النصوص العربية:

```css
/* ✅ Apply Cairo font to all Arabic text */
[dir="rtl"],
[lang="ar"],
html[lang="ar"],
body[lang="ar"] {
  font-family: var(--font-cairo), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
}

/* Apply Cairo to Arabic text in mixed content */
[dir="rtl"] *,
[lang="ar"] * {
  font-family: var(--font-cairo), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
}
```

#### المميزات:
- ✅ تطبيق Cairo تلقائياً على جميع النصوص العربية
- ✅ دعم `[dir="rtl"]` و `[lang="ar"]`
- ✅ تطبيق على العناصر المتداخلة
- ✅ استخدام `!important` لضمان الأولوية

---

### 2. ✅ `tailwind.config.ts`

#### التأكد من أن `font-arabic` يستخدم Cairo:

```typescript
fontFamily: {
  arabic: ['var(--font-cairo)', 'system-ui', 'sans-serif'],
  cairo: ['var(--font-cairo)', 'system-ui', 'sans-serif'],
}
```

---

### 3. ✅ `app/dashboard/certificates/[certificateId]/view/page.tsx`

#### تحديث جميع استخدامات الخطوط:

**قبل:**
```typescript
clone.style.fontFamily = "Almarai, Tajawal, system-ui, sans-serif";
el.style.fontFamily = "Cairo, Almarai, Tajawal, system-ui, sans-serif";
font-family: 'Cairo', 'Almarai', 'Tajawal', system-ui, sans-serif
ensureFontLink('pdf-fonts-almarai-tajawal', 'https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=Tajawal:wght@400;500;700;800;900&display=swap');
style={{ fontFamily: "'Almarai', 'Tajawal', system-ui, sans-serif" }}
```

**بعد:**
```typescript
clone.style.fontFamily = "Cairo, system-ui, sans-serif";
el.style.fontFamily = "Cairo, system-ui, sans-serif";
font-family: 'Cairo', system-ui, sans-serif
ensureFontLink('pdf-fonts-cairo', 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
style={{ fontFamily: "'Cairo', system-ui, sans-serif" }}
```

---

## 📊 النتائج

### قبل:
- ❌ استخدام Almarai و Tajawal في بعض الأماكن
- ❌ خطوط متعددة للعربي
- ❌ عدم توحيد الخط

### بعد:
- ✅ Cairo فقط للعربي في كل النظام
- ✅ تطبيق تلقائي على جميع النصوص العربية
- ✅ توحيد الخط في كل مكان

---

## 📝 الملفات المعدلة

1. ✅ `app/globals.css`
   - إضافة قواعد CSS لتطبيق Cairo على النصوص العربية

2. ✅ `tailwind.config.ts`
   - التأكد من أن `font-arabic` يستخدم Cairo

3. ✅ `app/dashboard/certificates/[certificateId]/view/page.tsx`
   - تحديث جميع استخدامات الخطوط إلى Cairo
   - إزالة Almarai و Tajawal
   - تحديث font loading links

---

## ✅ Checklist

- [x] تحديث globals.css
- [x] تحديث tailwind.config.ts
- [x] تحديث certificates view page
- [x] إزالة Almarai و Tajawal
- [x] التأكد من تطبيق Cairo على جميع النصوص العربية
- [x] تحديث font loading links

---

## 🎯 كيفية الاستخدام

### في المكونات:

```tsx
// ✅ سيتم تطبيق Cairo تلقائياً على النصوص العربية
<div dir="rtl" lang="ar">
  نص عربي
</div>

// ✅ أو استخدام class
<div className="font-arabic">
  نص عربي
</div>
```

### في CSS:

```css
/* ✅ Cairo سيتم تطبيقه تلقائياً */
[dir="rtl"] {
  /* Cairo applied automatically */
}
```

---

*آخر تحديث: ديسمبر 2024*

