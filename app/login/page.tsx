'use client';

import { useState, useCallback, useEffect } from 'react';
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
 * صفحة تسجيل الدخول
 * Login Page Component
 * 
 * تتيح للمستخدمين تسجيل الدخول إلى النظام باستخدام البريد الإلكتروني وكلمة المرور
 * Allows users to sign in to the system using email and password
 */
export default function LoginPage() {
  const router = useRouter();
  const { signIn, user } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  // حالة نموذج تسجيل الدخول
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // التحقق من حالة المستخدم - إعادة التوجيه إذا كان مسجلاً بالفعل
  // Check user authentication status - redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  /**
   * التحقق من صحة البريد الإلكتروني
   * Validate email format
   */
  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  /**
   * التحقق من صحة نموذج تسجيل الدخول
   * Validate login form
   */
  const validateForm = useCallback((): boolean => {
    // التحقق من وجود البريد الإلكتروني
    // Check if email is provided
    if (!email.trim()) {
      toast.error((t('email') || 'Email') + ' ' + (t('isRequired') || 'is required'));
      return false;
    }

    // التحقق من صحة تنسيق البريد الإلكتروني
    // Validate email format
    if (!validateEmail(email)) {
      toast.error(t('invalidEmail') || 'Invalid email format');
      return false;
    }

    // التحقق من وجود كلمة المرور
    // Check if password is provided
    if (!password.trim()) {
      toast.error((t('password') || 'Password') + ' ' + (t('isRequired') || 'is required'));
      return false;
    }

    // التحقق من طول كلمة المرور
    // Validate password length
    if (password.length < 6) {
      toast.error(t('passwordMinLength') || 'Password must be at least 6 characters');
      return false;
    }

    return true;
  }, [email, password, validateEmail, t]);

  /**
   * معالجة إرسال نموذج تسجيل الدخول
   * Handle login form submission
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
      // محاولة تسجيل الدخول
      // Attempt to sign in
      const { error } = await signIn(email.trim(), password);

      if (error) {
        // معالجة الأخطاء المختلفة
        // Handle different error types
        let errorMessage = t('loginError') || 'Login failed';

        if (error.message?.includes('Invalid login credentials') ||
            error.message?.includes('invalid_credentials')) {
          errorMessage = t('invalidCredentials') || t('loginError') || 'Invalid email or password';
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = t('emailNotConfirmed') || 'Please confirm your email address';
        } else if (error.message) {
          errorMessage = error.message;
        }

        toast.error(errorMessage);
      } else {
        // نجح تسجيل الدخول - سيتم التوجيه تلقائياً من AuthContext
        // Login successful - redirect will happen automatically from AuthContext
        toast.success(t('loginSuccess') || 'Login successful!');
      }
    } catch (error) {
      // معالجة الأخطاء غير المتوقعة
      // Handle unexpected errors
      console.error('Login error:', error);
      toast.error(t('unexpectedError') || 'An unexpected error occurred. Please try again.');
    } finally {
      // إعادة تعيين حالة التحميل
      // Reset loading state
      setLoading(false);
    }
  }, [email, password, signIn, validateForm, t]);

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

        {/* بطاقة تسجيل الدخول - تصميم عصري */}
        {/* Login card - Modern design */}
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
              {t('welcome')}
            </CardDescription>
          </CardHeader>

          {/* نموذج تسجيل الدخول */}
          {/* Login form */}
          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="space-y-5">
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
                  autoComplete="email"
                  placeholder={t('emailPlaceholder') || 'example@domain.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className={`h-12 ${language === 'ar' ? 'font-arabic' : ''}`}
                  aria-required="true"
                  aria-invalid={email && !validateEmail(email) ? 'true' : 'false'}
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
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  className={`h-12 ${language === 'ar' ? 'font-arabic' : ''}`}
                  aria-required="true"
                />
              </div>

              {/* زر تسجيل الدخول - تصميم عصري */}
              {/* Login button - Modern design */}
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
                  t('signIn')
                )}
              </Button>
            </CardContent>

            {/* رابط التسجيل */}
            {/* Registration link */}
            <CardFooter className="flex flex-col space-y-2 pt-2">
              <p className={`text-sm text-slate-600 dark:text-slate-400 text-center ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}>
                {t('dontHaveAccount')}{' '}
                <Link
                  href="/register"
                  className={`text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold transition-colors underline-offset-4 hover:underline ${language === 'ar' ? 'font-arabic' : ''}`}
                  aria-label={t('register') || 'Register'}
                >
                  {t('register')}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
