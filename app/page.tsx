'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Sparkles, Play, Users, BookOpen, Award, TrendingUp,
  CheckCircle, ArrowRight, Star, Zap, Shield, Rocket,
  Globe, Brain, Target, Clock, MessageSquare, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/OptimizedImage';
import Link from 'next/link';

export default function UltraModernLandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || (user && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-mesh">
        <div className="animate-spin-slow">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Floating Orbs Background - مستوحى من أكاديمية زاد */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="orb-primary w-96 h-96 top-0 left-0 -translate-x-1/2 -translate-y-1/2 opacity-30" />
        <div className="orb-accent w-96 h-96 top-1/4 right-0 translate-x-1/2 opacity-30" />
        <div className="orb-primary w-64 h-64 bottom-1/4 right-1/4 opacity-20" />
      </div>

      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 bg-dots pointer-events-none opacity-20" />

      {/* Navigation */}
      <nav className="relative z-50 border-b-2 border-primary/10 bg-white dark:bg-card shadow-sm">
        <div className="container-ultra">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 group-hover:border-primary/40 transition-all">
                  <OptimizedImage 
                    src="/icons/logo.jpg" 
                    alt="مدرسة البناء العلمي" 
                    width={48}
                    height={48}
                    priority
                    className="w-12 h-12 object-cover"
                  />
                </div>
              </div>
              <span className="text-2xl font-bold text-primary">
                مدرسة البناء العلمي
              </span>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-2">
              <a href="#features" className="nav-link-ultra">المميزات</a>
              <a href="#courses" className="nav-link-ultra">الدورات</a>
              <a href="#testimonials" className="nav-link-ultra">الآراء</a>
              <a href="#pricing" className="nav-link-ultra">الأسعار</a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="hidden sm:flex">
                  تسجيل الدخول
                </Button>
              </Link>
              <Link href="/register">
                <button className="btn-primary">
                  ابدأ الآن
                  <ArrowRight className="w-5 h-5 mr-2" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Zad Academy Style */}
      <section className="relative py-20 md:py-32">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center space-y-8 animate-fade-in-up">
            {/* Main Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="block text-primary mb-2">برنامج مدرسة البناء العلمي</span>
              <span className="block text-foreground">ما لا يسع المسلم جهله</span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-4xl mx-auto">
              ابدأ رحلتك التعليمية مع برنامج مدرسة البناء العلمي، عبر الإنترنت، وتعلَّم مبادئَ العلومِ الشرعية 
              واللغة العربية من خلال إصداراتٍ احترافيةٍ، يشرحها نخبةٌ من أهل الاختصاص، وأنت في بيتك، وأنت في أي مكان.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 justify-center pt-4 animate-fade-in-up delay-200">
              <Link href="/register">
                <button className="btn-primary text-lg px-8 py-4">
                  سجل الآن
                </button>
              </Link>
              <Link href="#about">
                <button className="btn-glass text-lg px-8 py-4">
                  تحميل المنهج
                </button>
              </Link>
              <button className="btn-outline text-lg px-8 py-4">
                أبلغني عند فتح التسجيل
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Zad Academy Style */}
      <section className="relative py-12 bg-white border-y border-border">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8">
            {/* Stat 1 */}
            <div className="text-center space-y-2 animate-fade-in-up">
              <div className="text-3xl md:text-4xl font-bold text-primary">4 مستويات</div>
              <div className="text-sm md:text-base text-muted-foreground">مدة البرنامج (عامين)</div>
            </div>

            {/* Stat 2 */}
            <div className="text-center space-y-2 animate-fade-in-up delay-100">
              <div className="text-3xl md:text-4xl font-bold text-accent">12 أسبوعاً</div>
              <div className="text-sm md:text-base text-muted-foreground">مدة المستوى الواحد</div>
            </div>

            {/* Stat 3 */}
            <div className="text-center space-y-2 animate-fade-in-up delay-200">
              <div className="text-3xl md:text-4xl font-bold text-success">مجاناً</div>
              <div className="text-sm md:text-base text-muted-foreground">عبر الإنترنت</div>
            </div>

            {/* Stat 4 */}
            <div className="text-center space-y-2 animate-fade-in-up delay-300">
              <div className="text-3xl md:text-4xl font-bold text-secondary">15 ساعة</div>
              <div className="text-sm md:text-base text-muted-foreground">أسبوعياً</div>
            </div>

            {/* Stat 5 */}
            <div className="text-center space-y-2 animate-fade-in-up delay-400 col-span-2 md:col-span-1">
              <div className="text-3xl md:text-4xl font-bold text-primary">18 يناير</div>
              <div className="text-sm md:text-base text-muted-foreground">بداية الدورة التالية</div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center mt-8">
            <Link href="/register">
              <button className="btn-primary text-lg px-12 py-4 animate-fade-in-up delay-500">
                سجل الآن
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section - عن البرنامج */}
      <section id="about" className="relative py-20 bg-background">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto space-y-6 animate-fade-in-up">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              عن برنامج مدرسة البناء العلمي
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              برنامجُ مدرسة البناء العلمي برنامجٌ إلكترونيٌّ تفاعليٌّ، يهدفُ إلى تقريبِ العلمِ الشرعيِّ للراغبين فيه،
              يوفّر لمتابعيه منصَّةً تفاعلية عن طريق شبكة الإنترنت.
            </p>
            <div className="pt-4">
              <Link href="#subjects">
                <button className="bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-xl font-semibold transition-all">
                  اكتشف المزيد
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Subjects/Courses Section - المواد الدراسية */}
      <section id="subjects" className="relative py-20 bg-muted">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 animate-fade-in-up">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              البرنامج الدراسي
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              برنامج مدرسة البناء العلمي يوفر سبعة مجالات علميّة للمشاركين فيه لتعزيز فهمٍ وسطيّ صحيح متدرجٌ 
              للإسلام مقترنٌ بالدليل وبأدوات عصريّة وأسلوب سهل وممتع.
            </p>
          </div>

          {/* Subjects Grid - 7 Subjects like Zad Academy */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Subject 1: العقيدة */}
            <div className="glass-card-hover p-8 space-y-4 group animate-fade-in-up border-r-4 border-primary">
              <div className="p-3 bg-primary/10 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-primary">العقيدة</h3>
              <p className="text-sm text-muted-foreground">مادة</p>
              <p className="text-muted-foreground leading-relaxed">
                ستتعرف على مبادئ علم العقيدة وفق منهج أهل السنة والجماعة بطريقة ميسرة وسهلة خالية من الحشو والمخالفات.
              </p>
            </div>

            {/* Subject 2: السيرة */}
            <div className="glass-card-hover p-8 space-y-4 group animate-fade-in-up delay-100 border-r-4 border-accent">
              <div className="p-3 bg-accent/10 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold text-accent">السيرة</h3>
              <p className="text-sm text-muted-foreground">مادة</p>
              <p className="text-muted-foreground leading-relaxed">
                ستتعرف بشكل مختصر على السيرة النبوية كاملة من الولادة إلى الوفاة، ثم تنتقل إلى الشمائل والمعاملات.
              </p>
            </div>

            {/* Subject 3: الفقه */}
            <div className="glass-card-hover p-8 space-y-4 group animate-fade-in-up delay-200 border-r-4 border-secondary">
              <div className="p-3 bg-secondary/10 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <Brain className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold text-secondary">الفقه</h3>
              <p className="text-sm text-muted-foreground">مادة</p>
              <p className="text-muted-foreground leading-relaxed">
                ستتعرف على أبواب العبادات كلها، بدءًا بالطهارة، وانتهاء بالحج، ثم المعاملات المالية وفقه الأسرة.
              </p>
            </div>

            {/* Subject 4: التفسير */}
            <div className="glass-card-hover p-8 space-y-4 group animate-fade-in-up delay-300 border-r-4 border-success">
              <div className="p-3 bg-success/10 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-2xl font-bold text-success">التفسير</h3>
              <p className="text-sm text-muted-foreground">مادة</p>
              <p className="text-muted-foreground leading-relaxed">
                بعد مدخل لعلم التفسير، ستعرف تفسير سورة الفاتحة، وآية الكرسي، وخواتيم سورة البقرة، وجزء عم كاملاً.
              </p>
            </div>

            {/* Subject 5: الحديث */}
            <div className="glass-card-hover p-8 space-y-4 group animate-fade-in-up delay-400 border-r-4 border-warning">
              <div className="p-3 bg-warning/10 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <MessageSquare className="w-8 h-8 text-warning" />
              </div>
              <h3 className="text-2xl font-bold text-warning">الحديث</h3>
              <p className="text-sm text-muted-foreground">مادة</p>
              <p className="text-muted-foreground leading-relaxed">
                بعد مدخل مختصر لعلم الحديث ستبحر مع مجموعة من الأحاديث النبوية التي تمثل أصول الشريعة والأخلاق والآداب.
              </p>
            </div>

            {/* Subject 6: التربية */}
            <div className="glass-card-hover p-8 space-y-4 group animate-fade-in-up delay-500 border-r-4 border-info">
              <div className="p-3 bg-info/10 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <Target className="w-8 h-8 text-info" />
              </div>
              <h3 className="text-2xl font-bold text-info">التربية</h3>
              <p className="text-sm text-muted-foreground">مادة</p>
              <p className="text-muted-foreground leading-relaxed">
                منهج متكامل تتعرف من خلاله على الحقوق والواجبات، ثم تنتقل في رحلة إيمانية مع أعمال القلوب وأمراضه.
              </p>
            </div>

            {/* Subject 7: اللغة العربية */}
            <div className="glass-card-hover p-8 space-y-4 group animate-fade-in-up delay-600 border-r-4 border-primary">
              <div className="p-3 bg-primary/10 rounded-2xl w-fit group-hover:scale-110 transition-transform">
                <Award className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-primary">اللغة العربية</h3>
              <p className="text-sm text-muted-foreground">مادة</p>
              <p className="text-muted-foreground leading-relaxed">
                بعد مدخل مختصر عن اللغة العربية، ستتعرف على أبواب النحو كاملة بشكل إبداعي، مع الأمثلة والتطبيقات.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Section - حديث نبوي */}
      <section className="relative py-16 bg-gradient-to-br from-primary via-primary-dark to-accent text-white">
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-6 animate-fade-in-up">
          <p className="text-sm opacity-80">قال رسول الله ﷺ</p>
          <h3 className="text-2xl md:text-4xl font-bold leading-relaxed">
            مَن سلَكَ طريقًا يلتَمِسُ فيهِ علمًا ؛ سَهَّلَ اللَّهُ لَهُ بهِ طريقًا إلى الجنَّةِ
          </h3>
          <p className="text-sm opacity-80">صحيح مسلم</p>
        </div>
      </section>

      {/* How to Join Section - مسارك للمشاركة */}
      <section className="relative py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 animate-fade-in-up">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              مسارك للمشاركة في البرنامج
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              اشترك في برنامج مدرسة البناء العلمي عبر الإنترنت من أيّ مكان في العالم وابدأ رحلتك التفاعلية بشكل مجانيّ.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center space-y-4 animate-fade-in-up">
              <div className="inline-flex w-20 h-20 items-center justify-center bg-primary/10 text-primary text-3xl font-bold rounded-full">
                1
              </div>
              <h3 className="text-xl font-bold">اختر اللغة</h3>
              <p className="text-muted-foreground">
                قم بالتسجيل واختر اللغة التي تفضل التعلم بها
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center space-y-4 animate-fade-in-up delay-200">
              <div className="inline-flex w-20 h-20 items-center justify-center bg-accent/10 text-accent text-3xl font-bold rounded-full">
                2
              </div>
              <h3 className="text-xl font-bold">ابدأ التعلم</h3>
              <p className="text-muted-foreground">
                تابع الدروس عبر الإنترنت في الوقت الذي يناسبك
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center space-y-4 animate-fade-in-up delay-400">
              <div className="inline-flex w-20 h-20 items-center justify-center bg-secondary/10 text-secondary text-3xl font-bold rounded-full">
                3
              </div>
              <h3 className="text-xl font-bold">احصل على الشهادة</h3>
              <p className="text-muted-foreground">
                أكمل البرنامج واحصل على شهادة إتمام معتمدة
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 bg-muted">
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-8 animate-fade-in-up">
          <div className="inline-flex p-4 bg-white/80 dark:bg-card/80 backdrop-blur-xl rounded-3xl shadow-2xl">
            <Rocket className="w-12 h-12 text-primary" />
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            ابدأ رحلتك التعليمية اليوم!
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            انضم إلى آلاف الطلاب الذين يطورون مهاراتهم معنا
          </p>

          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Link href="/register">
              <button className="btn-primary text-lg px-12 py-4">
                <Star className="w-5 h-5 ml-2" />
                سجل مجاناً
              </button>
            </Link>
            <Link href="/login">
              <button className="btn-glass text-lg px-12 py-4">
                تسجيل الدخول
                <ArrowRight className="w-5 h-5 mr-2" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer - Professional Style */}
      <footer className="relative z-10 bg-gradient-to-br from-primary via-primary-dark to-primary text-white">
        <div className="container mx-auto px-4 max-w-6xl py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Column 1: Logo & Description */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative overflow-hidden rounded-xl border-2 border-white/30 bg-white p-1">
                  <OptimizedImage 
                    src="/icons/logo.jpg" 
                    alt="مدرسة البناء العلمي" 
                    width={48}
                    height={48}
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold">مدرسة البناء العلمي</h3>
                  <p className="text-xs text-white/80">البداوي - طرابلس</p>
                </div>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                منصة تعليمية متكاملة توفر أفضل المناهج والمحتوى التعليمي بطريقة حديثة وتفاعلية.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold border-b border-white/20 pb-2">روابط سريعة</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="text-white/80 hover:text-white transition-colors">عن البرنامج</a></li>
                <li><a href="#subjects" className="text-white/80 hover:text-white transition-colors">المواد الدراسية</a></li>
                <li><a href="/login" className="text-white/80 hover:text-white transition-colors">تسجيل الدخول</a></li>
                <li><a href="/register" className="text-white/80 hover:text-white transition-colors">إنشاء حساب</a></li>
              </ul>
            </div>

            {/* Column 3: المواد */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold border-b border-white/20 pb-2">المواد الدراسية</h4>
              <ul className="space-y-2 text-sm">
                <li className="text-white/80">📖 العقيدة</li>
                <li className="text-white/80">🕌 السيرة النبوية</li>
                <li className="text-white/80">⚖️ الفقه</li>
                <li className="text-white/80">📕 التفسير</li>
                <li className="text-white/80">📜 الحديث</li>
                <li className="text-white/80">🌱 التربية</li>
                <li className="text-white/80">✍️ اللغة العربية</li>
              </ul>
            </div>

            {/* Column 4: Contact */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold border-b border-white/20 pb-2">تواصل معنا</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-accent">📍</span>
                  <span className="text-white/80">البداوي - طرابلس، ليبيا</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">📧</span>
                  <span className="text-white/80">info@benaaschool.ly</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">📞</span>
                  <span className="text-white/80">+218 XX XXX XXXX</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-white/20 text-center space-y-3">
            <p className="text-sm text-white/80">
              © 2025 مدرسة البناء العلمي. جميع الحقوق محفوظة.
            </p>
            <p className="text-xs text-white/60 flex items-center justify-center gap-2">
              <span>تم التطوير بواسطة</span>
              <a 
                href="https://fekratech.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-semibold text-accent hover:text-white transition-colors inline-flex items-center gap-1 group"
              >
                <span className="relative">
                  <span className="absolute inset-0 bg-accent/20 blur-md group-hover:blur-lg transition-all"></span>
                  <span className="relative">FekraTech</span>
                </span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">✨</span>
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
