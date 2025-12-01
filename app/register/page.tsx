'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputMask } from '@/components/InputMask';
import { OptimizedImage } from '@/components/OptimizedImage';
import { validateEmail, validatePassword, validateName, getFieldError } from '@/lib/formValidation';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { 
  Sparkles, Mail, Lock, User, Eye, EyeOff,
  Rocket, BookOpen, Users, Award, CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function UltraModernRegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student',
    preferredLanguage: language,
  });
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    fullName: false,
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Real-time validation
  const emailError = getFieldError(formData.email, touched.email, validateEmail);
  const passwordError = getFieldError(formData.password, touched.password, validatePassword);
  const fullNameError = getFieldError(formData.fullName, touched.fullName, validateName);

  const handleFieldChange = (field: 'email' | 'password' | 'fullName', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Mark as touched when user starts typing
    if (!touched[field]) {
      setTouched(prev => ({ ...prev, [field]: true }));
    }
  };

  const handleBlur = (field: 'email' | 'password' | 'fullName') => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ email: true, password: true, fullName: true });

    // Validate
    const emailValidation = validateEmail(formData.email);
    const passwordValidation = validatePassword(formData.password);
    const fullNameValidation = validateName(formData.fullName);

    if (!fullNameValidation.isValid) {
      toast.error(fullNameValidation.error || t('fullNameRequired'));
      return;
    }

    if (!emailValidation.isValid) {
      toast.error(emailValidation.error || t('emailRequired'));
      return;
    }

    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.error || t('passwordRequired'));
      return;
    }

    setLoading(true);

    try {
      const success = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.role as any,
        formData.preferredLanguage
      );
      
      if (success) {
        toast.success(t('registrationSuccess'));
        router.push('/dashboard');
      } else {
        toast.error(t('registrationError'));
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: BookOpen,
      title: t('comprehensiveContent'),
      description: t('accessLibrary')
    },
    {
      icon: Users,
      title: t('expertTeachers'),
      description: t('learnFromBest')
    },
    {
      icon: Award,
      title: t('certifiedCertificates'),
      description: t('getCertified')
    }
  ];

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Floating Orbs Background - Hidden on Mobile */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden md:block">
        <div className="orb-primary w-96 h-96 -top-20 -right-20" />
        <div className="orb-accent w-96 h-96 top-1/2 -left-20" />
        <div className="orb-secondary w-96 h-96 -bottom-20 right-1/3" />
      </div>

      {/* Gradient Mesh & Dots - Simplified on Mobile */}
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none hidden md:block" />
      <div className="fixed inset-0 bg-dots pointer-events-none opacity-30 hidden md:block" />

      {/* Mobile Theme Toggle */}
      <div className="absolute top-4 left-4 z-50 lg:hidden">
        <ThemeToggle />
      </div>

      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Glass Card */}
          <div className="glass-card p-6 md:p-8 space-y-6 md:space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="text-center space-y-4">
              {/* Logo */}
              <div className="inline-flex items-center justify-center animate-bounce-in">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-3xl blur-2xl opacity-40" />
                  <div className="relative glass-card p-4 md:p-6 rounded-3xl border-2 border-primary/30 shadow-2xl">
                    <OptimizedImage
                      src="/icons/logo.jpg"
                      alt={t('schoolName')}
                      width={64}
                      height={64}
                      priority 
                      className="w-24 h-24 md:w-32 md:h-32 object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-bold">
                <span className="text-primary">{t('joinUs')}</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground">
                {t('createAccountDesc')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2 animate-fade-in-up delay-100">
                <Label htmlFor="fullName" className="text-sm font-medium">
                  {t('fullName')}
                </Label>
                <div className="relative">
                  <User className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                    fullNameError ? "text-error" : "text-muted-foreground"
                  )} />
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleFieldChange('fullName', e.target.value)}
                    onBlur={() => handleBlur('fullName')}
                    className={cn(
                      "input-ultra pr-12",
                      fullNameError && "border-error focus:border-error focus:ring-error/20"
                    )}
                    placeholder={t('enterFullName')}
                    disabled={loading}
                    aria-invalid={!!fullNameError}
                    aria-describedby={fullNameError ? "fullName-error" : undefined}
                  />
                </div>
                {fullNameError && (
                  <div id="fullName-error" className="flex items-center gap-2 text-sm text-error animate-fade-in">
                    <AlertCircle className="h-4 w-4" />
                    <span>{fullNameError}</span>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2 animate-fade-in-up delay-200">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t('email')}
                </Label>
                <div className="relative">
                  <Mail className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                    emailError ? "text-error" : "text-muted-foreground"
                  )} />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={cn(
                      "input-ultra pr-12",
                      emailError && "border-error focus:border-error focus:ring-error/20"
                    )}
                    placeholder={t('enterEmail')}
                    disabled={loading}
                    dir="ltr"
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "email-error" : undefined}
                  />
                </div>
                {emailError && (
                  <div id="email-error" className="flex items-center gap-2 text-sm text-error animate-fade-in">
                    <AlertCircle className="h-4 w-4" />
                    <span>{emailError}</span>
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2 animate-fade-in-up delay-300">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t('password')}
                </Label>
                <div className="relative">
                  <Lock className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                    passwordError ? "text-error" : "text-muted-foreground"
                  )} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
                    className={cn(
                      "input-ultra pr-12 pl-12",
                      passwordError && "border-error focus:border-error focus:ring-error/20"
                    )}
                    placeholder={t('enterPassword')}
                    disabled={loading}
                    aria-invalid={!!passwordError}
                    aria-describedby={passwordError ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors min-h-[48px] min-w-[48px]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {passwordError ? (
                  <div id="password-error" className="flex items-center gap-2 text-sm text-error animate-fade-in">
                    <AlertCircle className="h-4 w-4" />
                    <span>{passwordError}</span>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {t('passwordMinLength')}
                    </p>
                    <p className="text-xs text-muted-foreground/80 flex items-center gap-1 mt-1">
                      <Lock className="w-3 h-3" />
                      <span>{t('passwordSecurityCheck')}</span>
                    </p>
                  </>
                )}
              </div>


              {/* Submit Button */}
              <button
                type="submit"
                className="w-full btn-primary animate-fade-in-up delay-500"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin-slow w-5 h-5 border-2 border-white/30 border-t-white rounded-full ml-2" />
                    {t('loading')}
                  </>
                ) : (
                  <>
                    {t('signUp')}
                    <Rocket className="w-5 h-5 mr-2" />
                  </>
                )}
              </button>

              {/* Sign In Link */}
              <div className="text-center animate-fade-in-up delay-600">
                <p className="text-sm text-muted-foreground">
                  {t('alreadyHaveAccount')}{' '}
                  <Link 
                    href="/login" 
                    className="font-medium text-primary hover:text-primary-dark transition-colors"
                  >
                    {t('signIn')}
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right Side - Features */}
      <div className="hidden lg:flex lg:flex-1 relative items-center justify-center p-12">
        <div className="relative z-10 max-w-lg space-y-8">
          {/* Badge */}
          <div className="inline-flex animate-bounce-in">
            <div className="badge-gradient">
              <Sparkles className="w-4 h-4" />
              <span>{t('startLearningJourney')}</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-5xl font-bold leading-tight animate-fade-in-up delay-100 text-primary">
            {t('joinThousands')}
          </h2>

          {/* Description */}
          <p className="text-xl text-muted-foreground leading-relaxed animate-fade-in-up delay-200">
            {t('startLearningToday')}
          </p>

          {/* Features */}
          <div className="space-y-6 animate-fade-in-up delay-300">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="glass-card-hover p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-primary/10 flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 pt-8 animate-fade-in-up delay-400">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="text-sm text-muted-foreground mt-1">{t('roleStudent')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">500+</div>
              <div className="text-sm text-muted-foreground mt-1">{t('course')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-secondary">98%</div>
              <div className="text-sm text-muted-foreground mt-1">{t('satisfaction')}</div>
            </div>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
