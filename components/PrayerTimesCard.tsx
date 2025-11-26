'use client';

/**
 * مكون عرض مواقيت الصلاة - محسّن
 * Enhanced Prayer Times Display Component
 * 
 * عرض احترافي لمواقيت الصلاة اليومية مع:
 * - عرض الصلاة القادمة مع عداد تنازلي
 * - تمييز بصري للصلاة الحالية
 * - أنيميشن سلسة ومتقدمة
 * - دعم كامل للغات الثلاث
 * - تصميم responsive متطور
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Clock, 
  Moon, 
  Sunrise, 
  Sun, 
  CloudSun, 
  Sunset, 
  Stars,
  MapPin,
  Calendar
} from 'lucide-react';
import { 
  getTodayPrayerTimes, 
  getNextPrayer, 
  getPrayerStatus,
  formatGregorianDateAr,
  formatGregorianDateEn,
  convertToHijri,
  type PrayerTime 
} from '@/lib/prayerTimes';

interface PrayerCardProps {
  name: string;
  nameAr: string;
  time: string;
  icon: React.ReactNode;
  status: 'upcoming' | 'current' | 'passed';
  isNext?: boolean;
}

const PrayerCard = ({ name, nameAr, time, icon, status, isNext }: PrayerCardProps) => {
  const { language } = useLanguage();
  const displayName = language === 'ar' ? nameAr : name;

  return (
    <div
      className={`
        group relative flex items-center gap-4 p-4 rounded-xl transition-all duration-500
        ${isNext 
          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-2xl shadow-emerald-500/30 scale-[1.02] border-2 border-emerald-400' 
          : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-800 dark:hover:to-slate-900'
        }
        ${status === 'current' ? 'ring-2 ring-amber-400 ring-offset-2 animate-pulse' : ''}
        ${status === 'passed' ? 'opacity-50 grayscale' : ''}
        hover:shadow-xl hover:scale-[1.01] cursor-pointer
      `}
    >
      {/* أيقونة الصلاة */}
      <div className={`
        relative p-3 rounded-2xl transition-all duration-500 group-hover:rotate-12 group-hover:scale-110
        ${isNext 
          ? 'bg-white/20 backdrop-blur-sm shadow-lg' 
          : 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50'
        }
      `}>
        <div className={isNext ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}>
          {icon}
        </div>
        {/* نقطة مضيئة للصلاة القادمة */}
        {isNext && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
        )}
      </div>

      {/* معلومات الصلاة */}
      <div className="flex-1 min-w-0">
        <p className={`
          font-bold text-lg mb-0.5 transition-colors
          ${isNext 
            ? 'text-white drop-shadow-md' 
            : 'text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
          }
        `}>
          {displayName}
        </p>
        <p className={`
          text-sm font-mono font-medium
          ${isNext 
            ? 'text-white/90' 
            : 'text-slate-600 dark:text-slate-400'
          }
        `}>
          {time}
        </p>
      </div>

      {/* Badge للصلاة القادمة - مع transition smoother */}
      {isNext && (
        <Badge 
          variant="secondary" 
          className="bg-white/90 text-emerald-600 border-0 font-bold shadow-lg backdrop-blur-sm px-3 py-1 transition-all duration-300 ease-in-out"
        >
          <Clock className="w-3 h-3 mr-1 animate-pulse" />
          <span className="transition-opacity duration-300">{language === 'ar' ? 'القادمة' : 'Next'}</span>
        </Badge>
      )}

      {/* خط تزييني */}
      {!isNext && status !== 'passed' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent rounded-full"></div>
      )}
    </div>
  );
};

export const PrayerTimesCard = () => {
  const { language, t } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime | null>(null);
  const [loading, setLoading] = useState(true);
  const [hijriDate, setHijriDate] = useState(convertToHijri());
  
  // استخدام useRef للاحتفاظ بالصلاة القادمة بشكل مستقر
  const stableNextPrayerRef = useRef<ReturnType<typeof getNextPrayer> | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // تحديث الوقت والتاريخ الهجري كل دقيقة
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setHijriDate(convertToHijri(now));
    }, 60000); // كل دقيقة

    return () => clearInterval(timer);
  }, []);

  // جلب مواقيت الصلاة
  useEffect(() => {
    const times = getTodayPrayerTimes();
    setPrayerTimes(times);
    setLoading(false);
  }, []);

  // حساب الصلاة القادمة - مع استقرار أفضل
  const nextPrayer = useMemo(() => {
    if (!prayerTimes) return null;
    
    const now = Date.now();
    const currentNextPrayer = getNextPrayer(prayerTimes);
    
    // إذا لم تكن هناك صلاة قادمة محفوظة، احفظها
    if (!stableNextPrayerRef.current) {
      stableNextPrayerRef.current = currentNextPrayer;
      lastUpdateRef.current = now;
      return currentNextPrayer;
    }
    
    // إذا تغيرت الصلاة القادمة بشكل واضح (أكثر من دقيقتين)، حدثها
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    const hasChanged = stableNextPrayerRef.current?.nameAr !== currentNextPrayer?.nameAr;
    
    if (hasChanged && timeSinceLastUpdate > 120000) { // أكثر من دقيقتين
      stableNextPrayerRef.current = currentNextPrayer;
      lastUpdateRef.current = now;
      return currentNextPrayer;
    }
    
    // خلاف ذلك، احتفظ بالصلاة القادمة السابقة للاستقرار
    return stableNextPrayerRef.current;
  }, [prayerTimes, Math.floor(currentTime.getTime() / 60000)]); // تحديث كل دقيقة فقط

  // أيقونات الصلوات
  const prayerIcons = {
    fajr: <Moon className="w-5 h-5" />,
    sunrise: <Sunrise className="w-5 h-5" />,
    dhuhr: <Sun className="w-5 h-5" />,
    asr: <CloudSun className="w-5 h-5" />,
    maghrib: <Sunset className="w-5 h-5" />,
    isha: <Stars className="w-5 h-5" />,
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!prayerTimes) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {language === 'ar' ? 'مواقيت الصلاة' : 'Prayer Times'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {language === 'ar' 
              ? 'لا تتوفر مواقيت الصلاة لهذا اليوم' 
              : 'Prayer times not available for today'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const prayers = [
    { key: 'fajr', nameAr: 'الفجر', name: 'Fajr', time: prayerTimes.fajr },
    { key: 'sunrise', nameAr: 'الشروق', name: 'Sunrise', time: prayerTimes.sunrise },
    { key: 'dhuhr', nameAr: 'الظهر', name: 'Dhuhr', time: prayerTimes.dhuhr },
    { key: 'asr', nameAr: 'العصر', name: 'Asr', time: prayerTimes.asr },
    { key: 'maghrib', nameAr: 'المغرب', name: 'Maghrib', time: prayerTimes.maghrib },
    { key: 'isha', nameAr: 'العشاء', name: 'Isha', time: prayerTimes.isha },
  ];

  return (
    <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/30 dark:from-slate-900 dark:via-emerald-950/20 dark:to-teal-950/20">
      {/* Header مع تدرج لوني */}
      <CardHeader className="relative pb-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 dark:from-emerald-500/5 dark:via-teal-500/5 dark:to-cyan-500/5">
        {/* خلفية منقطة */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>

        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {language === 'ar' ? 'مواقيت الصلاة' : 'Prayer Times'}
                </span>
                {nextPrayer && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant="outline" 
                      className="gap-1 border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400 transition-all duration-300 ease-in-out"
                    >
                      <Clock className="w-3 h-3 animate-pulse" />
                      <span className="transition-opacity duration-300">{nextPrayer.timeRemaining}</span>
                    </Badge>
                  </div>
                )}
              </div>
            </CardTitle>
          </div>
          
          {/* الموقع والتاريخ */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'طرابلس، لبنان' : 'Tripoli, Lebanon'}
              </span>
            </div>
            
            {/* التاريخ الميلادي */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {language === 'ar' ? formatGregorianDateAr(currentTime) : formatGregorianDateEn(currentTime)}
              </span>
            </div>
            
            {/* التاريخ الهجري - محسوب لليوم */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="font-medium text-slate-700 dark:text-slate-300 font-arabic">
                {hijriDate.dayName}، {hijriDate.day} {hijriDate.monthName} {hijriDate.year} هـ
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-3">
        {/* بطاقة الصلاة القادمة - محسّنة */}
        {nextPrayer && (
          <div className="relative mb-6 p-6 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-2xl shadow-2xl shadow-emerald-500/40 overflow-hidden">
            {/* خلفية متحركة */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 -left-4 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse"></div>
              <div className="absolute bottom-0 -right-4 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse delay-700"></div>
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Moon className="w-5 h-5 animate-pulse" />
                <p className="text-sm font-medium uppercase tracking-wider opacity-90">
                  {language === 'ar' ? 'الصلاة القادمة' : 'Next Prayer'}
                </p>
              </div>
              
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-black mb-1 drop-shadow-lg">
                    {nextPrayer.nameAr}
                  </p>
                  <p className="text-lg font-medium opacity-90">
                    {nextPrayer.name}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="text-5xl font-black mb-1 drop-shadow-lg">
                    {nextPrayer.time}
                  </p>
                  <p className="text-base font-bold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full inline-block">
                    {language === 'ar' ? 'بعد' : 'in'} {nextPrayer.timeRemaining}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* جميع الصلوات - تصميم محسّن */}
        <div className="space-y-3">
          {prayers.map((prayer, index) => {
            const status = getPrayerStatus(prayer.time);
            // استخدام الصلاة القادمة المستقرة لتجنب الوميض
            const isNext = stableNextPrayerRef.current?.nameAr === prayer.nameAr;
            
            return (
              <div 
                key={prayer.key}
                style={{
                  animation: `slideIn 0.5s ease-out ${index * 0.1}s both`
                }}
              >
                <PrayerCard
                  name={prayer.name}
                  nameAr={prayer.nameAr}
                  time={prayer.time.substring(0, 5)}
                  icon={prayerIcons[prayer.key as keyof typeof prayerIcons]}
                  status={status}
                  isNext={isNext}
                />
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* CSS للـ animations */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </Card>
  );
};

// نسخة مصغرة محسّنة للعرض في القائمة الجانبية
export const PrayerTimesCompact = () => {
  const { language } = useLanguage();
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime | null>(null);
  const [nextPrayer, setNextPrayer] = useState<ReturnType<typeof getNextPrayer>>(null);
  const [hijriDate, setHijriDate] = useState(convertToHijri());
  
  // استخدام useRef للاحتفاظ بالصلاة القادمة بشكل مستقر
  const stableNextPrayerRef = useRef<ReturnType<typeof getNextPrayer> | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const times = getTodayPrayerTimes();
    setPrayerTimes(times);
    if (times) {
      const initialNextPrayer = getNextPrayer(times);
      setNextPrayer(initialNextPrayer);
      stableNextPrayerRef.current = initialNextPrayer;
      lastUpdateRef.current = Date.now();
    }

    // تحديث كل دقيقة
    const interval = setInterval(() => {
      const now = new Date();
      setHijriDate(convertToHijri(now));
      if (times) {
        const currentNextPrayer = getNextPrayer(times);
        const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
        const hasChanged = stableNextPrayerRef.current?.nameAr !== currentNextPrayer?.nameAr;
        
        // تحديث فقط إذا تغيرت الصلاة بشكل واضح (أكثر من دقيقتين)
        if (hasChanged && timeSinceLastUpdate > 120000) {
          stableNextPrayerRef.current = currentNextPrayer;
          lastUpdateRef.current = Date.now();
          setNextPrayer(currentNextPrayer);
        } else {
          // خلاف ذلك، احتفظ بالصلاة القادمة السابقة للاستقرار
          setNextPrayer(stableNextPrayerRef.current);
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (!stableNextPrayerRef.current) return null;

  return (
    <div className="space-y-2">
      <div className="relative p-4 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-xl shadow-lg overflow-hidden">
        {/* خلفية متحركة */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full mix-blend-overlay filter blur-2xl animate-pulse"></div>
        </div>

        <div className="relative">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-90">
                  {language === 'ar' ? 'القادمة' : 'Next'}
                </p>
                <p className="font-bold text-lg">{stableNextPrayerRef.current.nameAr}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black">{stableNextPrayerRef.current.time}</p>
              <p className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full inline-block mt-1 transition-opacity duration-300">
                {stableNextPrayerRef.current.timeRemaining}
              </p>
            </div>
          </div>
          
          {/* التاريخ الهجري - محسوب لليوم */}
          <div className="pt-3 border-t border-white/20 text-center">
            <p className="text-xs font-medium opacity-90">
              {hijriDate.day} {hijriDate.monthName} {hijriDate.year} هـ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

