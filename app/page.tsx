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

// ✨ Islamic Geometric Pattern Component
const IslamicPattern = ({ className = '' }: { className?: string }) => (
  <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
    {/* Geometric Stars */}
    <svg className="absolute top-10 right-10 w-32 h-32 text-secondary/20 animate-spin-slow" viewBox="0 0 100 100">
      <polygon points="50,5 61,40 98,40 68,62 79,97 50,75 21,97 32,62 2,40 39,40" fill="currentColor"/>
    </svg>
    <svg className="absolute bottom-20 left-10 w-24 h-24 text-primary/15 animate-float-slow" viewBox="0 0 100 100">
      <polygon points="50,5 61,40 98,40 68,62 79,97 50,75 21,97 32,62 2,40 39,40" fill="currentColor"/>
    </svg>
    <svg className="absolute top-1/3 left-1/4 w-16 h-16 text-secondary/10 animate-float" viewBox="0 0 100 100">
      <polygon points="50,5 61,40 98,40 68,62 79,97 50,75 21,97 32,62 2,40 39,40" fill="currentColor"/>
    </svg>
    
    {/* Crescent Moons */}
    <svg className="absolute top-20 left-1/3 w-20 h-20 text-secondary/15 animate-float-slow delay-500" viewBox="0 0 100 100">
      <path d="M50 5 A45 45 0 1 1 50 95 A35 35 0 1 0 50 5" fill="currentColor"/>
    </svg>
    <svg className="absolute bottom-1/4 right-1/4 w-16 h-16 text-primary/10 animate-float delay-1000" viewBox="0 0 100 100">
      <path d="M50 5 A45 45 0 1 1 50 95 A35 35 0 1 0 50 5" fill="currentColor"/>
    </svg>

    {/* Geometric Diamonds */}
    <div className="absolute top-1/2 right-20 w-12 h-12 border-2 border-secondary/20 rotate-45 animate-float" />
    <div className="absolute bottom-1/3 left-20 w-8 h-8 border-2 border-primary/15 rotate-45 animate-float-slow delay-700" />
    <div className="absolute top-1/4 right-1/3 w-6 h-6 bg-secondary/10 rotate-45 animate-float delay-300" />
  </div>
);

// ✨ Islamic Divider Component
const IslamicDivider = ({ className = '' }: { className?: string }) => (
  <div className={`relative py-8 ${className}`}>
    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-secondary to-transparent" />
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
      <span className="text-secondary text-2xl">✦</span>
      <span className="text-primary text-3xl">۞</span>
      <span className="text-secondary text-2xl">✦</span>
    </div>
  </div>
);

// ✨ Bismillah Header Component
const BismillahHeader = ({ className = '' }: { className?: string }) => (
  <div className={`text-center py-6 ${className}`}>
    <p className="text-4xl md:text-5xl text-primary font-amiri leading-relaxed animate-fade-in-up">
      ﷽
    </p>
    <p className="text-sm text-muted-foreground mt-2 animate-fade-in-up delay-200">
      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
    </p>
  </div>
);

// ✨ Golden Border Card Component
const GoldenCard = ({ children, className = '', delay = '' }: { children: React.ReactNode; className?: string; delay?: string }) => (
  <div className={`relative group ${className} ${delay}`}>
    {/* Golden glow effect */}
    <div className="absolute -inset-1 bg-gradient-to-r from-secondary via-primary to-secondary rounded-2xl opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500" />
    {/* Card content */}
    <div className="relative glass-card p-8 space-y-4 border-2 border-transparent group-hover:border-secondary/40 transition-all duration-300">
      {children}
    </div>
  </div>
);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-mesh islamic-pattern">
        <div className="text-center space-y-4">
          <div className="animate-spin-slow">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <p className="text-2xl text-primary font-amiri">﷽</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ✨ Enhanced Floating Orbs Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[600px] h-[600px] top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl animate-float-slow" />
        <div className="absolute w-[500px] h-[500px] top-1/4 right-0 translate-x-1/2 rounded-full bg-secondary/20 blur-3xl animate-float-slow delay-500" />
        <div className="absolute w-[400px] h-[400px] bottom-1/4 right-1/4 rounded-full bg-accent/15 blur-3xl animate-float delay-1000" />
        <div className="absolute w-[300px] h-[300px] bottom-0 left-1/4 rounded-full bg-primary/15 blur-3xl animate-float-slow delay-700" />
      </div>

      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 bg-dots pointer-events-none opacity-30" />

      {/* Navigation */}
      <nav className="relative z-50 border-b-2 border-primary/10 bg-white/90 dark:bg-card/90 backdrop-blur-xl shadow-sm">
        <div className="container-ultra">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative overflow-hidden rounded-2xl border-2 border-secondary/30 group-hover:border-secondary/50 transition-all shadow-lg">
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

      {/* ✨ Hero Section with Islamic Patterns */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        {/* Islamic Geometric Patterns */}
        <IslamicPattern />
        
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          {/* ✨ Bismillah Header */}
          <BismillahHeader className="mb-8" />
          
          <div className="text-center space-y-8 animate-fade-in-up">
            {/* Main Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="block text-primary mb-2 font-display">برنامج مدرسة البناء العلمي</span>
              <span className="block text-foreground font-display">ما لا يسع المسلم جهله</span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-4xl mx-auto">
              ابدأ رحلتك التعليمية مع برنامج مدرسة البناء العلمي، عبر الإنترنت، وتعلَّم مبادئَ العلومِ الشرعية 
              واللغة العربية من خلال إصداراتٍ احترافيةٍ، يشرحها نخبةٌ من أهل الاختصاص، وأنت في بيتك، وأنت في أي مكان.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 justify-center pt-4 animate-fade-in-up delay-200">
              <Link href="/register">
                <button className="btn-primary text-lg px-8 py-4 shadow-glow-primary">
                  سجل الآن
                </button>
              </Link>
              <Link href="#about">
                <button className="btn-glass text-lg px-8 py-4">
                  تحميل المنهج
                </button>
              </Link>
              <button className="btn-outline-gold text-lg px-8 py-4">
                أبلغني عند فتح التسجيل
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ✨ Islamic Divider */}
      <IslamicDivider />

      {/* Stats Section with Golden Accents */}
      <section className="relative py-12 bg-card border-y border-secondary/20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8">
            {/* Stat 1 */}
            <div className="text-center space-y-2 animate-fade-in-up group">
              <div className="text-3xl md:text-4xl font-bold text-primary group-hover:text-secondary transition-colors">4 مستويات</div>
              <div className="text-sm md:text-base text-muted-foreground">مدة البرنامج (عامين)</div>
            </div>

            {/* Stat 2 */}
            <div className="text-center space-y-2 animate-fade-in-up delay-100 group">
              <div className="text-3xl md:text-4xl font-bold text-secondary group-hover:text-primary transition-colors">12 أسبوعاً</div>
              <div className="text-sm md:text-base text-muted-foreground">مدة المستوى الواحد</div>
            </div>

            {/* Stat 3 */}
            <div className="text-center space-y-2 animate-fade-in-up delay-200 group">
              <div className="text-3xl md:text-4xl font-bold text-success group-hover:text-secondary transition-colors">مجاناً</div>
              <div className="text-sm md:text-base text-muted-foreground">عبر الإنترنت</div>
            </div>

            {/* Stat 4 */}
            <div className="text-center space-y-2 animate-fade-in-up delay-300 group">
              <div className="text-3xl md:text-4xl font-bold text-secondary group-hover:text-primary transition-colors">15 ساعة</div>
              <div className="text-sm md:text-base text-muted-foreground">أسبوعياً</div>
            </div>

            {/* Stat 5 */}
            <div className="text-center space-y-2 animate-fade-in-up delay-400 col-span-2 md:col-span-1 group">
              <div className="text-3xl md:text-4xl font-bold text-primary group-hover:text-secondary transition-colors">18 يناير</div>
              <div className="text-sm md:text-base text-muted-foreground">بداية الدورة التالية</div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center mt-8">
            <Link href="/register">
              <button className="btn-primary text-lg px-12 py-4 animate-fade-in-up delay-500 shadow-glow-primary">
                سجل الآن
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section - عن البرنامج */}
      <section id="about" className="relative py-20 bg-background">
        <IslamicPattern className="opacity-50" />
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6 animate-fade-in-up">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-display">
              عن برنامج مدرسة البناء العلمي
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              برنامجُ مدرسة البناء العلمي برنامجٌ إلكترونيٌّ تفاعليٌّ، يهدفُ إلى تقريبِ العلمِ الشرعيِّ للراغبين فيه،
              يوفّر لمتابعيه منصَّةً تفاعلية عن طريق شبكة الإنترنت.
            </p>
            <div className="pt-4">
              <Link href="#subjects">
                <button className="bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-glow-accent">
                  اكتشف المزيد
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ✨ Islamic Divider */}
      <IslamicDivider />

      {/* ✨ Enhanced Subjects Section with Golden Border Cards */}
      <section id="subjects" className="relative py-20 bg-muted star-pattern">
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 animate-fade-in-up">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-display">
              البرنامج الدراسي
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              برنامج مدرسة البناء العلمي يوفر سبعة مجالات علميّة للمشاركين فيه لتعزيز فهمٍ وسطيّ صحيح متدرجٌ 
              للإسلام مقترنٌ بالدليل وبأدوات عصريّة وأسلوب سهل وممتع.
            </p>
          </div>

          {/* ✨ Enhanced Subjects Grid with Golden Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Subject 1: العقيدة */}
            <GoldenCard className="animate-fade-in-up" delay="">
              <div className="icon-frame-islamic w-fit">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-primary font-display">العقيدة</h3>
              <span className="badge-gold text-xs">مادة أساسية</span>
              <p className="text-muted-foreground leading-relaxed">
                ستتعرف على مبادئ علم العقيدة وفق منهج أهل السنة والجماعة بطريقة ميسرة وسهلة خالية من الحشو والمخالفات.
              </p>
            </GoldenCard>

            {/* Subject 2: السيرة */}
            <GoldenCard className="animate-fade-in-up" delay="delay-100">
              <div className="icon-frame-islamic w-fit">
                <BookOpen className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold text-accent font-display">السيرة</h3>
              <span className="badge-gold text-xs">مادة أساسية</span>
              <p className="text-muted-foreground leading-relaxed">
                ستتعرف بشكل مختصر على السيرة النبوية كاملة من الولادة إلى الوفاة، ثم تنتقل إلى الشمائل والمعاملات.
              </p>
            </GoldenCard>

            {/* Subject 3: الفقه */}
            <GoldenCard className="animate-fade-in-up" delay="delay-200">
              <div className="icon-frame-islamic w-fit">
                <Brain className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold text-secondary font-display">الفقه</h3>
              <span className="badge-gold text-xs">مادة أساسية</span>
              <p className="text-muted-foreground leading-relaxed">
                ستتعرف على أبواب العبادات كلها، بدءًا بالطهارة، وانتهاء بالحج، ثم المعاملات المالية وفقه الأسرة.
              </p>
            </GoldenCard>

            {/* Subject 4: التفسير */}
            <GoldenCard className="animate-fade-in-up" delay="delay-300">
              <div className="icon-frame-islamic w-fit">
                <FileText className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-2xl font-bold text-success font-display">التفسير</h3>
              <span className="badge-gold text-xs">مادة أساسية</span>
              <p className="text-muted-foreground leading-relaxed">
                بعد مدخل لعلم التفسير، ستعرف تفسير سورة الفاتحة، وآية الكرسي، وخواتيم سورة البقرة، وجزء عم كاملاً.
              </p>
            </GoldenCard>

            {/* Subject 5: الحديث */}
            <GoldenCard className="animate-fade-in-up" delay="delay-400">
              <div className="icon-frame-islamic w-fit">
                <MessageSquare className="w-8 h-8 text-warning" />
              </div>
              <h3 className="text-2xl font-bold text-warning font-display">الحديث</h3>
              <span className="badge-gold text-xs">مادة أساسية</span>
              <p className="text-muted-foreground leading-relaxed">
                بعد مدخل مختصر لعلم الحديث ستبحر مع مجموعة من الأحاديث النبوية التي تمثل أصول الشريعة والأخلاق والآداب.
              </p>
            </GoldenCard>

            {/* Subject 6: التربية */}
            <GoldenCard className="animate-fade-in-up" delay="delay-500">
              <div className="icon-frame-islamic w-fit">
                <Target className="w-8 h-8 text-info" />
              </div>
              <h3 className="text-2xl font-bold text-info font-display">التربية</h3>
              <span className="badge-gold text-xs">مادة أساسية</span>
              <p className="text-muted-foreground leading-relaxed">
                منهج متكامل تتعرف من خلاله على الحقوق والواجبات، ثم تنتقل في رحلة إيمانية مع أعمال القلوب وأمراضه.
              </p>
            </GoldenCard>

            {/* Subject 7: اللغة العربية */}
            <GoldenCard className="animate-fade-in-up" delay="delay-600">
              <div className="icon-frame-islamic w-fit">
                <Award className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-primary font-display">اللغة العربية</h3>
              <span className="badge-gold text-xs">مادة أساسية</span>
              <p className="text-muted-foreground leading-relaxed">
                بعد مدخل مختصر عن اللغة العربية، ستتعرف على أبواب النحو كاملة بشكل إبداعي، مع الأمثلة والتطبيقات.
              </p>
            </GoldenCard>
          </div>
        </div>
      </section>

      {/* ✨ Enhanced Quote Section with Ayah Box Style */}
      <section className="relative py-20 bg-gradient-to-br from-primary via-primary to-accent text-white overflow-hidden">
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="islamic-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <polygon points="10,0 20,10 10,20 0,10" fill="white" fillOpacity="0.1"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#islamic-pattern)"/>
          </svg>
        </div>
        
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-6 relative z-10">
          {/* Opening Quote Mark */}
          <span className="text-6xl text-secondary/50 font-serif">"</span>
          
          <p className="text-sm opacity-80">قال رسول الله ﷺ</p>
          
          <h3 className="text-2xl md:text-4xl font-bold leading-relaxed font-amiri">
            مَن سلَكَ طريقًا يلتَمِسُ فيهِ علمًا ؛ سَهَّلَ اللَّهُ لَهُ بهِ طريقًا إلى الجنَّةِ
          </h3>
          
          {/* Closing Quote Mark */}
          <span className="text-6xl text-secondary/50 font-serif">"</span>
          
          <p className="text-sm opacity-80 pt-4">صحيح مسلم</p>
          
          {/* Decorative Line */}
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-secondary to-transparent mx-auto mt-4" />
        </div>
      </section>

      {/* ✨ Islamic Divider */}
      <IslamicDivider />

      {/* How to Join Section - مسارك للمشاركة */}
      <section className="relative py-20 bg-card">
        <IslamicPattern className="opacity-30" />
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 animate-fade-in-up">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground font-display">
              مسارك للمشاركة في البرنامج
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              اشترك في برنامج مدرسة البناء العلمي عبر الإنترنت من أيّ مكان في العالم وابدأ رحلتك التفاعلية بشكل مجانيّ.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center space-y-4 animate-fade-in-up group">
              <div className="relative inline-flex">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="relative w-24 h-24 flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 text-primary text-4xl font-bold rounded-full border-2 border-secondary/30 group-hover:border-secondary/60 transition-all">
                  ١
                </div>
              </div>
              <h3 className="text-xl font-bold font-display">اختر اللغة</h3>
              <p className="text-muted-foreground">
                قم بالتسجيل واختر اللغة التي تفضل التعلم بها
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center space-y-4 animate-fade-in-up delay-200 group">
              <div className="relative inline-flex">
                <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="relative w-24 h-24 flex items-center justify-center bg-gradient-to-br from-accent/20 to-primary/20 text-accent text-4xl font-bold rounded-full border-2 border-secondary/30 group-hover:border-secondary/60 transition-all">
                  ٢
                </div>
              </div>
              <h3 className="text-xl font-bold font-display">ابدأ التعلم</h3>
              <p className="text-muted-foreground">
                تابع الدروس عبر الإنترنت في الوقت الذي يناسبك
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center space-y-4 animate-fade-in-up delay-400 group">
              <div className="relative inline-flex">
                <div className="absolute inset-0 bg-gradient-to-r from-secondary to-accent rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="relative w-24 h-24 flex items-center justify-center bg-gradient-to-br from-secondary/20 to-accent/20 text-secondary text-4xl font-bold rounded-full border-2 border-secondary/30 group-hover:border-secondary/60 transition-all">
                  ٣
                </div>
              </div>
              <h3 className="text-xl font-bold font-display">احصل على الشهادة</h3>
              <p className="text-muted-foreground">
                أكمل البرنامج واحصل على شهادة إتمام معتمدة
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ✨ Enhanced CTA Section */}
      <section className="relative py-20 bg-muted overflow-hidden">
        <IslamicPattern className="opacity-40" />
        <div className="container mx-auto px-4 max-w-4xl text-center space-y-8 relative z-10 animate-fade-in-up">
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-3xl blur-2xl opacity-30 animate-pulse-glow" />
            <div className="relative p-6 bg-card/90 backdrop-blur-xl rounded-3xl shadow-islamic border-2 border-secondary/30">
              <Rocket className="w-16 h-16 text-primary" />
            </div>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-foreground font-display">
            ابدأ رحلتك التعليمية اليوم!
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            انضم إلى آلاف الطلاب الذين يطورون مهاراتهم معنا
          </p>

          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Link href="/register">
              <button className="btn-primary text-lg px-12 py-4 shadow-glow-primary">
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

      {/* ✨ Enhanced Footer with Islamic Design */}
      <footer className="relative z-10 bg-gradient-to-br from-primary via-primary to-accent text-white overflow-hidden">
        {/* Decorative Top Border */}
        <div className="h-2 bg-gradient-to-r from-secondary via-white/50 to-secondary" />
        
        <div className="container mx-auto px-4 max-w-6xl py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Column 1: Logo & Description */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative overflow-hidden rounded-xl border-2 border-secondary/50 bg-white p-1 shadow-lg">
                  <OptimizedImage 
                    src="/icons/logo.jpg" 
                    alt="مدرسة البناء العلمي" 
                    width={48}
                    height={48}
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display">مدرسة البناء العلمي</h3>
                  <p className="text-xs text-white/80">البداوي - طرابلس</p>
                </div>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                منصة تعليمية متكاملة توفر أفضل المناهج والمحتوى التعليمي بطريقة حديثة وتفاعلية.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold border-b border-secondary/40 pb-2 font-display">روابط سريعة</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="text-white/80 hover:text-secondary transition-colors">عن البرنامج</a></li>
                <li><a href="#subjects" className="text-white/80 hover:text-secondary transition-colors">المواد الدراسية</a></li>
                <li><a href="/login" className="text-white/80 hover:text-secondary transition-colors">تسجيل الدخول</a></li>
                <li><a href="/register" className="text-white/80 hover:text-secondary transition-colors">إنشاء حساب</a></li>
              </ul>
            </div>

            {/* Column 3: المواد */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold border-b border-secondary/40 pb-2 font-display">المواد الدراسية</h4>
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
              <h4 className="text-lg font-bold border-b border-secondary/40 pb-2 font-display">تواصل معنا</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-secondary">📍</span>
                  <span className="text-white/80">البداوي - طرابلس، ليبيا</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-secondary">📧</span>
                  <span className="text-white/80">info@benaaschool.ly</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-secondary">📞</span>
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
                className="font-semibold text-secondary hover:text-white transition-colors inline-flex items-center gap-1 group"
              >
                <span className="relative">
                  <span className="absolute inset-0 bg-secondary/20 blur-md group-hover:blur-lg transition-all"></span>
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
