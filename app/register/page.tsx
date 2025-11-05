'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

/**
 * صفحة التسجيل
 * Register Page Component
 * 
 * تتيح للمستخدمين إنشاء حساب جديد في النظام
 * Allows users to create a new account in the system
 */
export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  
  // حالة نموذج التسجيل
  // Registration form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student',
    preferredLanguage: language,
  });
  const [loading, setLoading] = useState(false);

  /**
   * التحقق من صحة البريد الإلكتروني
   * Validate email format
   */
  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  /**
   * التحقق من صحة نموذج التسجيل
   * Validate registration form
   */
  const validateForm = useCallback((): boolean => {
    // التحقق من الاسم الكامل
    // Check if full name is provided
    if (!formData.fullName.trim()) {
      toast.error((t('fullName') || 'Full Name') + ' ' + (t('isRequired') || 'is required'));
      return false;
    }

    // التحقق من البريد الإلكتروني
    // Check if email is provided
    if (!formData.email.trim()) {
      toast.error((t('email') || 'Email') + ' ' + (t('isRequired') || 'is required'));
      return false;
    }

    // التحقق من صحة تنسيق البريد الإلكتروني
    // Validate email format
    if (!validateEmail(formData.email)) {
      toast.error(t('invalidEmail') || 'Invalid email format');
      return false;
    }

    // التحقق من كلمة المرور
    // Check if password is provided
    if (!formData.password.trim()) {
      toast.error((t('password') || 'Password') + ' ' + (t('isRequired') || 'is required'));
      return false;
    }

    // التحقق من طول كلمة المرور
    // Validate password length
    if (formData.password.length < 6) {
      toast.error(t('passwordMinLength') || 'Password must be at least 6 characters');
      return false;
    }

    return true;
  }, [formData, validateEmail, t]);

  /**
   * معالجة إرسال نموذج التسجيل
   * Handle registration form submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // التحقق من صحة النموذج قبل الإرسال
    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    // تعيين حالة التحميل
    // Set loading state
    setLoading(true);

    try {
      // محاولة التسجيل
      // Attempt to register
      const { error } = await signUp(
        formData.email.trim(),
        formData.password,
        formData.fullName.trim(),
        formData.role,
        formData.preferredLanguage
      );

      if (error) {
        // معالجة الأخطاء المختلفة
        // Handle different error types
        let errorMessage = t('registerError') || 'Registration failed';
        
        if (error.message?.includes('already registered') || 
            error.message?.includes('already exists')) {
          errorMessage = t('emailAlreadyExists') || 'This email is already registered';
        } else if (error.message?.includes('weak password')) {
          errorMessage = t('passwordMinLength') || 'Password must be at least 6 characters';
        } else if (error.message) {
          errorMessage = error.message;
        }

        toast.error(errorMessage);
      } else {
        // نجح التسجيل
        // Registration successful
        toast.success(t('registerSuccess') || 'Registration successful! Please check your email.');
        // سيتم التوجيه تلقائياً من AuthContext
        // Redirect will happen automatically from AuthContext
      }
    } catch (error) {
      // معالجة الأخطاء غير المتوقعة
      // Handle unexpected errors
      console.error('Registration error:', error);
      toast.error(t('unexpectedError') || 'An unexpected error occurred. Please try again.');
    } finally {
      // إعادة تعيين حالة التحميل
      // Reset loading state
      setLoading(false);
    }
  }, [formData, signUp, validateForm, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden">
      {/* خلفية ديكورية محسنة */}
      {/* Enhanced decorative background */}
      <div className="absolute inset-0 bg-grid-slate-100/[0.2] dark:bg-grid-slate-900/[0.04] bg-[length:20px_20px]" />
      <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* محدد اللغة */}
        {/* Language selector */}
        <div className="flex justify-end mb-6">
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value as 'en' | 'ar' | 'fr')}
            aria-label={t('language') || 'Language'}
          >
            <SelectTrigger className="w-36 border-2 border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm hover:border-emerald-500 dark:hover:border-emerald-400 transition-all duration-300 shadow-md hover:shadow-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* بطاقة التسجيل - تصميم عصري */}
        {/* Registration card - Modern design */}
        <Card className="glass-strong shadow-2xl border-slate-200/80 dark:border-slate-800/80">
          <CardHeader className="space-y-4 text-center">
            {/* أيقونة المدرسة - تصميم محسن */}
            {/* School icon - Enhanced design */}
            <div className="flex justify-center mb-2">
              <div className="relative p-5 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 rounded-2xl shadow-2xl shadow-emerald-500/40 hover:scale-110 hover:rotate-3 transition-all duration-500 group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <GraduationCap className="w-10 h-10 text-white relative z-10 drop-shadow-lg" aria-hidden="true" />
                <div className="absolute -inset-1 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
              </div>
            </div>

            {/* عنوان الصفحة */}
            {/* Page title */}
            <CardTitle className={`text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent animate-gradient ${language === 'ar' ? 'font-arabic' : 'font-display'}`}>
              {t('appName')}
            </CardTitle>

            {/* وصف الصفحة */}
            {/* Page description */}
            <CardDescription className={`text-base text-slate-600 dark:text-slate-300 leading-relaxed ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
              {t('register')}
            </CardDescription>
          </CardHeader>

          {/* نموذج التسجيل */}
          {/* Registration form */}
          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="space-y-5">
              {/* حقل الاسم الكامل */}
              {/* Full name field */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className={`text-sm font-medium text-slate-700 dark:text-slate-300 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {t('fullName')}
                  <span className="text-red-500 ml-1" aria-label="required">*</span>
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder={t('fullNamePlaceholder') || 'John Doe'}
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  disabled={loading}
                  className={`h-12 ${language === 'ar' ? 'font-arabic' : ''}`}
                  aria-required="true"
                />
              </div>

              {/* حقل البريد الإلكتروني */}
              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email" className={`text-sm font-medium text-slate-700 dark:text-slate-300 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {t('email')}
                  <span className="text-red-500 ml-1" aria-label="required">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t('emailPlaceholder') || 'example@domain.com'}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={loading}
                  className={`h-12 ${language === 'ar' ? 'font-arabic' : ''}`}
                  aria-required="true"
                  aria-invalid={formData.email && !validateEmail(formData.email) ? 'true' : 'false'}
                />
              </div>

              {/* حقل كلمة المرور */}
              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="password" className={`text-sm font-medium text-slate-700 dark:text-slate-300 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {t('password')}
                  <span className="text-red-500 ml-1" aria-label="required">*</span>
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={loading}
                  minLength={6}
                  className={`h-12 ${language === 'ar' ? 'font-arabic' : ''}`}
                  aria-required="true"
                />
              </div>

              {/* حقل الدور */}
              {/* Role field */}
              <div className="space-y-2">
                <Label htmlFor="role" className={`text-sm font-medium text-slate-700 dark:text-slate-300 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {t('role')}
                  <span className="text-red-500 ml-1" aria-label="required">*</span>
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  disabled={loading}
                >
                  <SelectTrigger className={`h-12 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    <SelectValue placeholder={t('selectRole') || 'Select a role'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">{t('student')}</SelectItem>
                    <SelectItem value="teacher">{t('teacher')}</SelectItem>
                    <SelectItem value="supervisor">{t('supervisor')}</SelectItem>
                    <SelectItem value="admin">{t('admin')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* حقل اللغة المفضلة */}
              {/* Preferred language field */}
              <div className="space-y-2">
                <Label htmlFor="language" className={`text-sm font-medium text-slate-700 dark:text-slate-300 ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {t('language')}
                </Label>
                <Select
                  value={formData.preferredLanguage}
                  onValueChange={(value) => setFormData({ ...formData, preferredLanguage: value as 'en' | 'ar' | 'fr' })}
                  disabled={loading}
                >
                  <SelectTrigger className={`h-12 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* زر التسجيل - تصميم عصري */}
              {/* Register button - Modern design */}
              <Button
                type="submit"
                className={`w-full h-12 text-base font-semibold mt-6 ${language === 'ar' ? 'font-arabic' : ''}`}
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                    {t('loading')}
                  </>
                ) : (
                  t('signUp')
                )}
              </Button>
            </CardContent>

            {/* رابط تسجيل الدخول */}
            {/* Login link */}
            <CardFooter className="flex flex-col space-y-2 pt-2">
              <p className={`text-sm text-slate-600 dark:text-slate-400 text-center ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
                {t('alreadyHaveAccount')}{' '}
                <Link
                  href="/login"
                  className={`text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold transition-colors underline-offset-4 hover:underline ${language === 'ar' ? 'font-arabic' : ''}`}
                  aria-label={t('login') || 'Login'}
                >
                  {t('login')}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
