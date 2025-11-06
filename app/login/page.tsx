'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Sparkles, LogIn, Mail, Lock, Eye, EyeOff, CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function UltraModernLoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { t, language } = useLanguage();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim()) {
      toast.error('البريد الإلكتروني مطلوب');
      return;
    }

    if (!formData.password) {
      toast.error('كلمة المرور مطلوبة');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        toast.error('خطأ في البريد الإلكتروني أو كلمة المرور');
      } else {
        toast.success('تم تسجيل الدخول بنجاح!');
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex overflow-hidden bg-background">
      {/* Floating Orbs Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="orb-primary w-96 h-96 -top-20 -left-20" />
        <div className="orb-accent w-96 h-96 top-1/3 -right-20" />
        <div className="orb-secondary w-96 h-96 -bottom-20 left-1/3" />
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
                <span className="text-primary">أهلاً بعودتك!</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                سجل دخولك للمتابعة
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2 animate-fade-in-up delay-100">
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
              <div className="space-y-2 animate-fade-in-up delay-200">
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
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full btn-primary animate-fade-in-up delay-300"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin-slow w-5 h-5 border-2 border-white/30 border-t-white rounded-full ml-2" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  <>
                    تسجيل الدخول
                    <LogIn className="w-5 h-5 mr-2" />
                  </>
                )}
              </button>

              {/* Register Link */}
              <div className="text-center animate-fade-in-up delay-400">
                <p className="text-sm text-muted-foreground">
                  ليس لديك حساب؟{' '}
                  <Link 
                    href="/register" 
                    className="font-medium text-primary hover:text-primary-dark transition-colors"
                  >
                    سجل الآن
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex lg:flex-1 relative items-center justify-center p-12">
        <div className="relative z-10 max-w-lg space-y-8">
          {/* Badge */}
          <div className="inline-flex animate-bounce-in">
            <div className="badge-gradient">
              <Sparkles className="w-4 h-4" />
              <span>منصة تعليمية متقدمة</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-5xl font-bold leading-tight animate-fade-in-up delay-100 text-primary">
            استمتع بتجربة تعليمية فريدة
          </h2>

          {/* Description */}
          <p className="text-xl text-muted-foreground leading-relaxed animate-fade-in-up delay-200">
            منصة حديثة توفر أفضل الأدوات لإدارة العملية التعليمية
          </p>

          {/* Features */}
          <div className="space-y-4 animate-fade-in-up delay-300">
            {[
              'واجهة عصرية وسهلة الاستخدام',
              'تتبع دقيق للتقدم الدراسي',
              'تواصل مباشر مع المعلمين',
              'شهادات معتمدة'
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="p-1 bg-success/20 rounded-full">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <span className="text-foreground">{feature}</span>
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
