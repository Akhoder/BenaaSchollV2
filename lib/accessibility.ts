/**
 * Accessibility Utilities
 * Phase 2 UX Improvement: Accessibility
 * Helper functions for ARIA labels and accessibility
 */

/**
 * Generate ARIA label for icon-only buttons
 */
export function getIconButtonLabel(iconName: string, action: string, language: 'ar' | 'en' | 'fr' = 'ar'): string {
  const labels: Record<string, Record<string, string>> = {
    ar: {
      settings: 'إعدادات',
      delete: 'حذف',
      edit: 'تعديل',
      save: 'حفظ',
      cancel: 'إلغاء',
      close: 'إغلاق',
      menu: 'القائمة',
      search: 'بحث',
      filter: 'تصفية',
      sort: 'ترتيب',
      more: 'المزيد',
      back: 'رجوع',
      next: 'التالي',
      previous: 'السابق',
    },
    en: {
      settings: 'Settings',
      delete: 'Delete',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      menu: 'Menu',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      more: 'More',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
    },
  };

  return labels[language]?.[action] || action;
}

/**
 * Generate live region announcement for screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get accessible name for form fields
 */
export function getFieldAccessibleName(
  label: string,
  required: boolean,
  language: 'ar' | 'en' | 'fr' = 'ar'
): string {
  const requiredText = language === 'ar' ? 'مطلوب' : 'required';
  return required ? `${label} (${requiredText})` : label;
}

/**
 * Format error message for screen readers
 */
export function formatErrorForScreenReader(
  fieldName: string,
  error: string,
  language: 'ar' | 'en' | 'fr' = 'ar'
): string {
  const prefix = language === 'ar' ? 'خطأ في' : 'Error in';
  return `${prefix} ${fieldName}: ${error}`;
}

