'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!formData.fullName.trim()) {
      toast.error('الاسم الكامل مطلوب');
      return false;
    }

    if (!formData.email.trim()) {
      toast.error('البريد الإلكتروني مطلوب');
      return false;
    }

    if (!validateEmail(formData.email)) {
      toast.error('صيغة البريد الإلكتروني غير صحيحة');
      return false;
    }

    if (!formData.password.trim()) {
      toast.error('كلمة المرور مطلوبة');
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return false;
    }

    return true;
  }, [formData, validateEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
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
        toast.success('تم إنشاء الحساب بنجاح!');
        router.push('/dashboard');
      } else {
        toast.error('فشل إنشاء الحساب');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'حدث خطأ أثناء التسجيل');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: BookOpen,
      title: 'محتوى تعليمي شامل',
      description: 'الوصول إلى مكتبة ضخمة من الدورات'
    },
    {
      icon: Users,
      title: 'مدرسون محترفون',
      description: 'تعلم من أفضل المعلمين'
    },
    {
      icon: Award,
      title: 'شهادات معتمدة',
      description: 'احصل على شهادات معترف بها'
    }
  ];

  return (
    <div className="min-h-screen flex overflow-hidden bg-background">
      {/* Floating Orbs Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="orb-primary w-96 h-96 -top-20 -right-20" />
        <div className="orb-accent w-96 h-96 top-1/2 -left-20" />
        <div className="orb-secondary w-96 h-96 -bottom-20 right-1/3" />
      </div>

      {/* Gradient Mesh & Dots */}
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 bg-dots pointer-events-none opacity-30" />

      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Glass Card */}
          <div className="glass-card p-8 space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="text-center space-y-4">
              {/* Logo */}
              <div className="inline-flex items-center justify-center animate-bounce-in">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-3xl blur-2xl opacity-40" />
                  <div className="relative glass-card p-6 rounded-3xl border-2 border-primary/30 shadow-2xl">
                    <img 
                      src="/icons/logo.jpg" 
                      alt="مدرسة البناء العلمي" 
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-4xl font-bold">
                <span className="text-primary">انضم إلينا!</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                أنشئ حسابك وابدأ رحلتك التعليمية
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2 animate-fade-in-up delay-100">
                <Label htmlFor="fullName" className="text-sm font-medium">
                  الاسم الكامل
                </Label>
                <div className="relative">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="input-ultra pr-12"
                    placeholder="أدخل اسمك الكامل"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2 animate-fade-in-up delay-200">
                <Label htmlFor="email" className="text-sm font-medium">
                  البريد الإلكتروني
                </Label>
                <div className="relative">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-ultra pr-12"
                    placeholder="example@email.com"
                    disabled={loading}
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2 animate-fade-in-up delay-300">
                <Label htmlFor="password" className="text-sm font-medium">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-ultra pr-12 pl-12"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  يجب أن تكون 6 أحرف على الأقل
                </p>
              </div>

              {/* Role */}
              <div className="space-y-2 animate-fade-in-up delay-400">
                <Label htmlFor="role" className="text-sm font-medium">
                  الدور
                </Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  disabled={loading}
                >
                  <SelectTrigger className="input-ultra">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">طالب</SelectItem>
                    <SelectItem value="teacher">معلم</SelectItem>
                    <SelectItem value="supervisor">مشرف</SelectItem>
                  </SelectContent>
                </Select>
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
                    جاري إنشاء الحساب...
                  </>
                ) : (
                  <>
                    إنشاء حساب
                    <Rocket className="w-5 h-5 mr-2" />
                  </>
                )}
              </button>

              {/* Sign In Link */}
              <div className="text-center animate-fade-in-up delay-600">
                <p className="text-sm text-muted-foreground">
                  لديك حساب بالفعل؟{' '}
                  <Link 
                    href="/login" 
                    className="font-medium text-primary hover:text-primary-dark transition-colors"
                  >
                    سجل دخولك
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
              <span>ابدأ رحلتك التعليمية</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-5xl font-bold leading-tight animate-fade-in-up delay-100 text-primary">
            انضم إلى آلاف الطلاب
          </h2>

          {/* Description */}
          <p className="text-xl text-muted-foreground leading-relaxed animate-fade-in-up delay-200">
            ابدأ التعلم اليوم واحصل على شهادات معتمدة
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
              <div className="text-sm text-muted-foreground mt-1">طالب</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">500+</div>
              <div className="text-sm text-muted-foreground mt-1">دورة</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-secondary">98%</div>
              <div className="text-sm text-muted-foreground mt-1">رضا</div>
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
