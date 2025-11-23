/**
 * Form Validation Utilities
 * Phase 1 UX Improvement: Forms and Input
 * Provides real-time validation with clear error messages
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface FieldValidation {
  value: string;
  touched: boolean;
  error?: string;
}

// Email validation
export function validateEmail(email: string): ValidationResult {
  if (!email.trim()) {
    return { isValid: false, error: 'البريد الإلكتروني مطلوب' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'صيغة البريد الإلكتروني غير صحيحة' };
  }
  
  return { isValid: true };
}

// Password validation
export function validatePassword(password: string, minLength: number = 6): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'كلمة المرور مطلوبة' };
  }
  
  if (password.length < minLength) {
    return { 
      isValid: false, 
      error: `كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل` 
    };
  }
  
  // ✅ TEMPORARILY DISABLED: Password strength requirements
  // TODO: Re-enable password strength requirements later
  // const hasUpperCase = /[A-Z]/.test(password);
  // const hasLowerCase = /[a-z]/.test(password);
  // const hasNumbers = /\d/.test(password);
  
  // if (password.length >= 8 && (!hasUpperCase || !hasLowerCase || !hasNumbers)) {
  //   return { 
  //     isValid: false, 
  //     error: 'كلمة المرور يجب أن تحتوي على أحرف كبيرة وصغيرة وأرقام' 
  //   };
  // }
  
  return { isValid: true };
}

// Required field validation
export function validateRequired(value: string, fieldName: string = 'هذا الحقل'): ValidationResult {
  if (!value.trim()) {
    return { isValid: false, error: `${fieldName} مطلوب` };
  }
  
  return { isValid: true };
}

// Name validation
export function validateName(name: string): ValidationResult {
  if (!name.trim()) {
    return { isValid: false, error: 'الاسم الكامل مطلوب' };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: 'الاسم يجب أن يكون على الأقل حرفين' };
  }
  
  return { isValid: true };
}

// Phone validation (optional)
export function validatePhone(phone: string): ValidationResult {
  if (!phone.trim()) {
    return { isValid: true }; // Optional field
  }
  
  const phoneRegex = /^[0-9+\-\s()]+$/;
  if (!phoneRegex.test(phone)) {
    return { isValid: false, error: 'صيغة رقم الهاتف غير صحيحة' };
  }
  
  return { isValid: true };
}

// Real-time validation helper
export function getFieldError(
  value: string,
  touched: boolean,
  validator: (value: string) => ValidationResult
): string | undefined {
  if (!touched) return undefined;
  
  const result = validator(value);
  return result.isValid ? undefined : result.error;
}

// Form validation state manager
export class FormValidator {
  private validators: Map<string, (value: string) => ValidationResult> = new Map();
  private fields: Map<string, FieldValidation> = new Map();

  registerField(
    name: string,
    validator: (value: string) => ValidationResult,
    initialValue: string = ''
  ) {
    this.validators.set(name, validator);
    this.fields.set(name, {
      value: initialValue,
      touched: false,
      error: undefined
    });
  }

  updateField(name: string, value: string, validateOnChange: boolean = true) {
    const field = this.fields.get(name);
    if (!field) return;

    field.value = value;
    
    if (validateOnChange && field.touched) {
      const validator = this.validators.get(name);
      if (validator) {
        const result = validator(value);
        field.error = result.isValid ? undefined : result.error;
      }
    }
  }

  touchField(name: string) {
    const field = this.fields.get(name);
    if (!field) return;

    field.touched = true;
    
    const validator = this.validators.get(name);
    if (validator) {
      const result = validator(field.value);
      field.error = result.isValid ? undefined : result.error;
    }
  }

  getFieldError(name: string): string | undefined {
    return this.fields.get(name)?.error;
  }

  isFieldValid(name: string): boolean {
    const field = this.fields.get(name);
    return field ? !field.error : true;
  }

  isFormValid(): boolean {
    for (const [name, field] of this.fields.entries()) {
      if (field.error) return false;
      
      const validator = this.validators.get(name);
      if (validator) {
        const result = validator(field.value);
        if (!result.isValid) return false;
      }
    }
    return true;
  }

  getAllErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const [name, field] of this.fields.entries()) {
      if (field.error) {
        errors[name] = field.error;
      }
    }
    return errors;
  }

  reset() {
    for (const field of this.fields.values()) {
      field.value = '';
      field.touched = false;
      field.error = undefined;
    }
  }
}

