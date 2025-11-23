# 🎯 Button Usage Guide
## Standardized Button Patterns for BenaaSchool

This guide ensures consistent button usage across the entire application.

---

## ✅ Standard Button Component

**Always use the `Button` component from `@/components/ui/button`**

```tsx
import { Button } from '@/components/ui/button';
```

---

## 🎨 Button Variants

### 1. Default (Primary Actions)
**Use for**: Main actions, primary CTAs, form submissions

```tsx
<Button variant="default">
  حفظ التغييرات
</Button>
```

**Visual**: Gradient from primary to accent color

---

### 2. Destructive (Delete/Remove)
**Use for**: Delete, remove, destructive actions

```tsx
<Button variant="destructive">
  حذف
</Button>
```

**Visual**: Red gradient

---

### 3. Outline (Secondary Actions)
**Use for**: Secondary actions, cancel buttons, alternative options

```tsx
<Button variant="outline">
  إلغاء
</Button>
```

**Visual**: Outlined border with primary color

---

### 4. Secondary (Alternative Actions)
**Use for**: Alternative primary actions, less important CTAs

```tsx
<Button variant="secondary">
  عرض المزيد
</Button>
```

**Visual**: Secondary color gradient

---

### 5. Ghost (Subtle Actions)
**Use for**: Subtle actions, toolbar buttons, icon-only buttons

```tsx
<Button variant="ghost">
  <Settings className="h-4 w-4" />
</Button>
```

**Visual**: Transparent with hover background

---

### 6. Link (Text Links)
**Use for**: Inline links, "Learn more" links

```tsx
<Button variant="link">
  معرفة المزيد
</Button>
```

**Visual**: Text link with underline on hover

---

### 7. Success (Positive Actions)
**Use for**: Confirm, approve, positive actions

```tsx
<Button variant="success">
  تأكيد
</Button>
```

**Visual**: Green gradient

---

## 📏 Button Sizes

### Small (`sm`)
**Use for**: Compact spaces, tables, cards

```tsx
<Button size="sm">صغير</Button>
```

### Default
**Use for**: Most buttons, forms

```tsx
<Button>افتراضي</Button>
```

### Large (`lg`)
**Use for**: Hero sections, prominent CTAs

```tsx
<Button size="lg">كبير</Button>
```

### Icon (`icon`)
**Use for**: Icon-only buttons

```tsx
<Button size="icon">
  <Settings className="h-4 w-4" />
</Button>
```

---

## 🔄 Loading States

**Always show loading state for async actions**

```tsx
<Button disabled={loading}>
  {loading ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      جاري الحفظ...
    </>
  ) : (
    'حفظ'
  )}
</Button>
```

---

## ❌ What NOT to Use

### ❌ Custom CSS Classes
**Don't use**: `btn-primary`, `btn-secondary`, `btn-glass`, `btn-ultra`

**Instead use**: Button component variants

### ❌ Inline Styles
**Don't use**: Custom inline button styles

**Instead use**: Button component with proper variants

### ❌ Native `<button>` with custom classes
**Don't use**: `<button className="btn-primary">`

**Instead use**: `<Button variant="default">`

---

## ✅ Best Practices

### 1. Button Labels
- Use action verbs: "حفظ", "إرسال", "حذف"
- Be specific: "حفظ التغييرات" not just "حفظ"
- Keep it short: Max 2-3 words

### 2. Button Placement
- Primary action: Right side (LTR) or Left side (RTL)
- Secondary action: Left side (LTR) or Right side (RTL)
- Destructive actions: Separate visually, add confirmation

### 3. Button Groups
- Use consistent spacing: `gap-2` or `gap-4`
- Align buttons properly
- Group related actions together

### 4. Disabled States
- Always disable during loading
- Show loading indicator
- Provide clear feedback

### 5. Accessibility
- Always include `aria-label` for icon-only buttons
- Use semantic HTML
- Ensure keyboard navigation works

---

## 📝 Examples

### Form Submit Button
```tsx
<Button 
  type="submit" 
  variant="default" 
  disabled={loading}
  className="w-full"
>
  {loading ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      جاري الحفظ...
    </>
  ) : (
    'حفظ التغييرات'
  )}
</Button>
```

### Delete Button with Confirmation
```tsx
<Button 
  variant="destructive" 
  size="sm"
  onClick={handleDelete}
>
  <Trash className="h-4 w-4 mr-2" />
  حذف
</Button>
```

### Action Group
```tsx
<div className="flex items-center gap-2">
  <Button variant="default">حفظ</Button>
  <Button variant="outline">إلغاء</Button>
  <Button variant="ghost" size="icon">
    <MoreVertical className="h-4 w-4" />
  </Button>
</div>
```

### Icon Button
```tsx
<Button 
  variant="ghost" 
  size="icon"
  aria-label="إعدادات"
>
  <Settings className="h-4 w-4" />
</Button>
```

---

## 🔄 Migration Guide

### Before (Custom Classes)
```tsx
<button className="btn-primary">
  حفظ
</button>
```

### After (Button Component)
```tsx
<Button variant="default">
  حفظ
</Button>
```

---

## 📚 Related Components

- `LoadingButton` - Button with loading state
- `ProgressIndicator` - For showing progress
- `ErrorDisplay` - For error states

---

**Last Updated**: Phase 1 UX Improvements
**Status**: Active Standard

