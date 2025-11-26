'use client';

/**
 * مكون عرض مواقيت الصلاة للعرض على شاشة التلفاز
 * Prayer Times Display Component for TV Display
 * 
 * تصميم احترافي مناسب للعرض في حرم المسجد
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
  Calendar,
  BookOpen,
  Quote
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
import { OptimizedImage } from '@/components/OptimizedImage';
import Image from 'next/image';

// الرسائل الدعوية اليومية - مجموعة متنوعة
const dailyMessages = [
  {
    type: 'ayah',
    text: 'وَمَا خَلَقْتُ الْجِنَّ وَالْإِنْسَ إِلَّا لِيَعْبُدُونِ',
    source: 'سورة الذاريات - الآية 56',
    translation: 'وما خلقت الجن والإنس إلا ليعبدون'
  },
  {
    type: 'hadith',
    text: 'الصَّلَاةُ عِمَادُ الدِّينِ، مَنْ أَقَامَهَا أَقَامَ الدِّينَ، وَمَنْ هَدَمَهَا هَدَمَ الدِّينَ',
    source: 'حديث شريف',
    translation: 'الصلاة عماد الدين، من أقامها أقام الدين، ومن هدمها هدم الدين'
  },
  {
    type: 'ayah',
    text: 'وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ وَارْكَعُوا مَعَ الرَّاكِعِينَ',
    source: 'سورة البقرة - الآية 43',
    translation: 'وأقيموا الصلاة وآتوا الزكاة واركعوا مع الراكعين'
  },
  {
    type: 'hadith',
    text: 'مَنْ حَافَظَ عَلَى الصَّلَوَاتِ الْخَمْسِ كَانَ لَهُ نُورًا وَبُرْهَانًا وَنَجَاةً يَوْمَ الْقِيَامَةِ',
    source: 'حديث شريف',
    translation: 'من حافظ على الصلوات الخمس كان له نورًا وبرهانًا ونجاة يوم القيامة'
  },
  {
    type: 'ayah',
    text: 'إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا',
    source: 'سورة النساء - الآية 103',
    translation: 'إن الصلاة كانت على المؤمنين كتابًا موقوتًا'
  },
  {
    type: 'hadith',
    text: 'أَوَّلُ مَا يُحَاسَبُ بِهِ الْعَبْدُ يَوْمَ الْقِيَامَةِ الصَّلَاةُ',
    source: 'حديث شريف',
    translation: 'أول ما يحاسب به العبد يوم القيامة الصلاة'
  },
  {
    type: 'wisdom',
    text: 'أفضل الأعمال الصلاة في وقتها',
    source: 'حكمة',
    translation: 'أفضل الأعمال الصلاة في وقتها'
  },
  {
    type: 'reminder',
    text: 'الوقت هو الحياة، فلا تضيعه في غير طاعة الله',
    source: 'موعظة',
    translation: 'الوقت هو الحياة، فلا تضيعه في غير طاعة الله'
  },
  {
    type: 'wisdom',
    text: 'الصلاة راحة للقلب وطمأنينة للنفس',
    source: 'حكمة',
    translation: 'الصلاة راحة للقلب وطمأنينة للنفس'
  },
  {
    type: 'ayah',
    text: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ وَإِنَّهَا لَكَبِيرَةٌ إِلَّا عَلَى الْخَاشِعِينَ',
    source: 'سورة البقرة - الآية 45',
    translation: 'واستعينوا بالصبر والصلاة وإنها لكبيرة إلا على الخاشعين'
  },
  {
    type: 'hadith',
    text: 'الصَّلَاةُ نُورٌ، وَالصَّدَقَةُ بُرْهَانٌ، وَالصَّبْرُ ضِيَاءٌ',
    source: 'حديث شريف',
    translation: 'الصلاة نور، والصدقة برهان، والصبر ضياء'
  },
  {
    type: 'reminder',
    text: 'احرص على الصلاة في أول وقتها، فهي أحب الأعمال إلى الله',
    source: 'موعظة',
    translation: 'احرص على الصلاة في أول وقتها، فهي أحب الأعمال إلى الله'
  }
];

// الحصول على الرسالة اليومية بناءً على اليوم
function getDailyMessage(): typeof dailyMessages[0] {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return dailyMessages[dayOfYear % dailyMessages.length];
}

interface PrayerCardProps {
  name: string;
  nameAr: string;
  time: string;
  icon: React.ReactNode;
  status: 'upcoming' | 'current' | 'passed';
  isNext?: boolean;
}

const PrayerCardLarge = ({ name, nameAr, time, icon, status, isNext }: PrayerCardProps) => {
  const { language } = useLanguage();
  const displayName = language === 'ar' ? nameAr : name;

  return (
    <div
      className={`
        group relative flex flex-col items-center justify-between gap-0.5 p-1 rounded-md transition-all duration-500 border-2
        ${isNext 
          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-md shadow-emerald-500/40 scale-[1.02] border-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800' 
          : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-800 dark:hover:to-slate-900 border-slate-200 dark:border-slate-700'
        }
        ${status === 'current' ? 'ring-1 ring-amber-400 animate-pulse border-amber-300' : ''}
        ${status === 'passed' ? 'opacity-60 grayscale' : ''}
        hover:shadow-sm hover:scale-[1.01] cursor-pointer
      `}
    >
      {/* زخرفة إسلامية صغيرة */}
      {!isNext && (
        <div className="absolute top-0 right-0 w-3 h-3 opacity-20">
          <div className="w-full h-full border border-emerald-300 dark:border-emerald-700 rounded-full"></div>
        </div>
      )}
      
      {/* أيقونة الصلاة */}
      <div className={`
        relative p-0.5 rounded-md transition-all duration-500 flex-shrink-0
        ${isNext 
          ? 'bg-white/20 backdrop-blur-sm shadow-sm' 
          : 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50'
        }
      `}>
        <div className={isNext ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}>
          {icon}
        </div>
        {/* نقطة مضيئة للصلاة القادمة */}
        {isNext && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
        )}
      </div>

      {/* معلومات الصلاة */}
      <div className="flex-1 min-w-0 text-center w-full flex flex-col justify-center">
        <p className={`
          font-black text-xs mb-0 transition-colors leading-tight
          ${isNext 
            ? 'text-white drop-shadow-md' 
            : 'text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
          }
        `}>
          {displayName}
        </p>
        <p className={`
          text-sm md:text-base font-mono font-black leading-tight
          ${isNext 
            ? 'text-white/90' 
            : 'text-slate-600 dark:text-slate-400'
          }
        `}>
          {time}
        </p>
      </div>

      {/* Badge للصلاة القادمة */}
      {isNext && (
        <Badge 
          variant="secondary" 
          className="bg-white/90 text-emerald-600 border-0 font-black text-xs shadow-sm backdrop-blur-sm px-1 py-0.5 transition-all duration-300 ease-in-out flex-shrink-0"
        >
          <Clock className="w-2 h-2 mr-0.5 animate-pulse" />
          <span className="transition-opacity duration-300">{language === 'ar' ? 'القادمة' : 'Next'}</span>
        </Badge>
      )}

      {/* خط تزييني */}
      {!isNext && status !== 'passed' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent rounded-full"></div>
      )}
    </div>
  );
};

export const PrayerTimesDisplay = () => {
  const { language, t } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime | null>(null);
  const [loading, setLoading] = useState(true);
  const [hijriDate, setHijriDate] = useState(convertToHijri());
  const [dailyMessage] = useState(getDailyMessage());
  
  // استخدام useRef للاحتفاظ بالصلاة القادمة بشكل مستقر
  const stableNextPrayerRef = useRef<ReturnType<typeof getNextPrayer> | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // تحديث الوقت والتاريخ الهجري كل دقيقة
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setHijriDate(convertToHijri(now));
    }, 60000);

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
    
    if (!stableNextPrayerRef.current) {
      stableNextPrayerRef.current = currentNextPrayer;
      lastUpdateRef.current = now;
      return currentNextPrayer;
    }
    
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    const hasChanged = stableNextPrayerRef.current?.nameAr !== currentNextPrayer?.nameAr;
    
    if (hasChanged && timeSinceLastUpdate > 120000) {
      stableNextPrayerRef.current = currentNextPrayer;
      lastUpdateRef.current = now;
      return currentNextPrayer;
    }
    
    return stableNextPrayerRef.current;
  }, [prayerTimes, Math.floor(currentTime.getTime() / 60000)]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!prayerTimes) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'لا تتوفر مواقيت الصلاة لهذا اليوم' 
              : 'Prayer times not available for today'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const prayerIcons = {
    fajr: <Moon className="w-5 h-5 md:w-6 md:h-6" />,
    sunrise: <Sunrise className="w-5 h-5 md:w-6 md:h-6" />,
    dhuhr: <Sun className="w-5 h-5 md:w-6 md:h-6" />,
    asr: <CloudSun className="w-5 h-5 md:w-6 md:h-6" />,
    maghrib: <Sunset className="w-5 h-5 md:w-6 md:h-6" />,
    isha: <Stars className="w-5 h-5 md:w-6 md:h-6" />,
  };

  const prayers = [
    { key: 'fajr', nameAr: 'الفجر', name: 'Fajr', time: prayerTimes.fajr },
    { key: 'sunrise', nameAr: 'الشروق', name: 'Sunrise', time: prayerTimes.sunrise },
    { key: 'dhuhr', nameAr: 'الظهر', name: 'Dhuhr', time: prayerTimes.dhuhr },
    { key: 'asr', nameAr: 'العصر', name: 'Asr', time: prayerTimes.asr },
    { key: 'maghrib', nameAr: 'المغرب', name: 'Maghrib', time: prayerTimes.maghrib },
    { key: 'isha', nameAr: 'العشاء', name: 'Isha', time: prayerTimes.isha },
  ];

  // أسماء الأشهر
  const gregorianMonths = language === 'ar' 
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const arabicDayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const currentDayName = arabicDayNames[currentTime.getDay()];
  const currentMonth = gregorianMonths[currentTime.getMonth()];
  const currentDay = currentTime.getDate();
  const currentYear = currentTime.getFullYear();

  return (
    <div className="space-y-1 md:space-y-1.5 h-full flex flex-col">
      {/* Header Section - قسم المسجد والتاريخ - مدمج */}
      <Card className="overflow-hidden border-3 md:border-4 border-emerald-400 dark:border-emerald-600 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/40 shadow-2xl flex-shrink-0 relative backdrop-blur-sm">
        {/* زخارف إسلامية - أنماط هندسية */}
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none">
          {/* أنماط نجمية */}
          <div 
            className="absolute top-3 right-3 w-16 h-16 border-2 border-emerald-300 dark:border-emerald-700 transform rotate-45"
            style={{ animation: 'islamicRotate 30s linear infinite' }}
          ></div>
          <div 
            className="absolute bottom-3 left-3 w-12 h-12 border-2 border-teal-300 dark:border-teal-700 transform rotate-45"
            style={{ animation: 'islamicRotate 30s linear infinite', animationDirection: 'reverse' }}
          ></div>
          {/* أنماط قوسية */}
          <div className="absolute top-0 left-0 w-24 h-24 opacity-25">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path d="M 10 50 Q 50 10, 90 50 Q 50 90, 10 50" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
          {/* خطوط زخرفية */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-300 dark:via-emerald-700 to-transparent"></div>
        </div>
        
        <CardContent className="p-3 md:p-4 relative">
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 items-center">
            {/* شعار المسجد - محسّن */}
            <div className="flex-shrink-0 flex justify-center md:justify-start">
              <div className="relative w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 shadow-2xl flex items-center justify-center ring-4 ring-emerald-300 dark:ring-emerald-700 overflow-hidden border-4 border-white dark:border-slate-800">
                {/* زخارف إسلامية داخل الشعار */}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute top-2 left-2 w-5 h-5 border-2 border-white rounded-full"></div>
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-2 border-white rounded-full"></div>
                  {/* أنماط نجمية */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white rounded-full"></div>
                </div>
                {/* شعار المسجد */}
                <div className="relative z-10 w-full h-full flex items-center justify-center bg-white/15 rounded-2xl backdrop-blur-md p-3">
                  <Image
                    src="/icons/masjed.png"
                    alt="شعار مسجد أم المؤمنين خديجة"
                    width={140}
                    height={140}
                    className="object-contain w-full h-full drop-shadow-2xl filter brightness-110"
                    priority
                  />
                </div>
                {/* هلال */}
                <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full shadow-lg ring-2 ring-emerald-400"></div>
                {/* أنماط زخرفية */}
                <div className="absolute bottom-2 left-2 w-4 h-4 border-2 border-white/50 transform rotate-45"></div>
                {/* توهج */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-3xl"></div>
              </div>
            </div>
            
            {/* اسم المسجد - محسّن */}
            <div className="flex-1 text-center md:text-right space-y-2">
              <div className="relative">
                {/* توهج خلفي */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-200/50 via-transparent to-transparent blur-xl"></div>
                <h2 className="relative text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-emerald-900 dark:text-emerald-50 mb-2 leading-tight drop-shadow-lg">
                  <span className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 dark:from-emerald-300 dark:via-emerald-200 dark:to-teal-200 bg-clip-text text-transparent">
                    مسجد أم المؤمنين خديجة
                  </span>
                </h2>
              </div>
              <p className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-emerald-700 dark:text-emerald-300 mb-3 leading-tight drop-shadow-md">
                رضي الله عنها
              </p>
              <div className="flex items-center justify-center md:justify-end gap-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 rounded-xl shadow-md border-2 border-emerald-200 dark:border-emerald-800 inline-flex">
                <MapPin className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 dark:text-emerald-400" />
                <p className="text-base md:text-lg lg:text-xl font-bold text-emerald-800 dark:text-emerald-200">
                  البداوي - طرابلس
                </p>
              </div>
            </div>

            {/* التاريخ البارز - مدمج */}
            <div className="flex-shrink-0 border-r-0 md:border-r-3 border-t-3 md:border-t-0 border-blue-300 dark:border-blue-700 pt-2 md:pt-0 md:pl-4 md:pr-0 relative">
              {/* زخارف إسلامية صغيرة */}
              <div className="absolute top-1 right-1 w-4 h-4 opacity-25">
                <div className="w-full h-full border-2 border-blue-400 dark:border-blue-600 rounded-full"></div>
              </div>
              <div className="absolute bottom-1 left-1 w-3 h-3 opacity-25">
                <div className="w-full h-full border-2 border-teal-400 dark:border-teal-600 transform rotate-45"></div>
              </div>
              <div className="text-center space-y-2 relative">
                {/* اليوم */}
                <div className="pb-2 border-b-3 border-blue-300 dark:border-blue-700">
                  <Calendar className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                  <p className="text-base md:text-lg lg:text-xl font-black text-blue-900 dark:text-blue-100">
                    {currentDayName}
                  </p>
                </div>
                
                {/* التاريخ الميلادي */}
                <div className="pt-1">
                  <p className="text-xs md:text-sm font-bold text-blue-700 dark:text-blue-300 mb-1">
                    {language === 'ar' ? 'الميلادي' : 'Gregorian'}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <p className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black text-blue-600 dark:text-blue-400">
                      {currentDay}
                    </p>
                    <p className="text-sm md:text-base lg:text-lg font-bold text-blue-800 dark:text-blue-200">
                      {currentMonth}
                    </p>
                  </div>
                  <p className="text-xs md:text-sm font-semibold text-blue-700 dark:text-blue-300 mt-1">
                    {currentYear}
                  </p>
                </div>
                
                {/* التاريخ الهجري */}
                <div className="pt-2 border-t-3 border-teal-300 dark:border-teal-700">
                  <p className="text-xs md:text-sm font-bold text-teal-700 dark:text-teal-300 mb-1">
                    {language === 'ar' ? 'الهجري' : 'Hijri'}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <p className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black text-teal-600 dark:text-teal-400">
                      {hijriDate.day}
                    </p>
                    <p className="text-sm md:text-base lg:text-lg font-bold text-teal-800 dark:text-teal-200">
                      {hijriDate.monthName}
                    </p>
                  </div>
                  <p className="text-xs md:text-sm font-semibold text-teal-700 dark:text-teal-300 mt-1">
                    {hijriDate.year} هـ
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* مواقيت الصلاة - مضغوطة جداً */}
      <Card className="overflow-hidden border-2 md:border-4 border-emerald-300 dark:border-emerald-700 shadow-xl bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/30 dark:from-slate-900 dark:via-emerald-950/20 dark:to-teal-950/20 flex-shrink-0">
        {/* زخارف إسلامية - أنماط هندسية */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 20px),
              repeating-linear-gradient(-45deg, transparent, transparent 10px, currentColor 10px, currentColor 20px)
            `,
            backgroundSize: '40px 40px'
          }}></div>
          {/* أنماط نجمية */}
          <div 
            className="absolute top-4 right-4 w-16 h-16 border-2 border-emerald-300 dark:border-emerald-700 rounded-full"
            style={{ animation: 'islamicRotate 30s linear infinite' }}
          ></div>
          <div 
            className="absolute bottom-4 left-4 w-12 h-12 border-2 border-teal-300 dark:border-teal-700 rounded-full"
            style={{ animation: 'islamicRotate 30s linear infinite', animationDirection: 'reverse' }}
          ></div>
          {/* أنماط قوسية صغيرة */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-24 h-8 opacity-15">
            <svg viewBox="0 0 100 30" className="w-full h-full">
              <path d="M 10 15 Q 50 5, 90 15" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          </div>
        </div>
        
        <CardHeader className="relative pb-1 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 dark:from-emerald-500/5 dark:via-teal-500/5 dark:to-cyan-500/5 flex-shrink-0">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}></div>
          </div>

          <div className="relative">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-1.5 gap-1">
              <CardTitle className="flex items-center gap-1.5">
                <div className="p-1 md:p-1.5 rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md ring-1 ring-emerald-200 dark:ring-emerald-800">
                  <Clock className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div>
                  <span className="text-lg md:text-xl lg:text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent block">
                    {language === 'ar' ? 'مواقيت الصلاة' : 'Prayer Times'}
                  </span>
                  {nextPrayer && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge 
                        variant="outline" 
                        className="gap-0.5 border-emerald-400 text-emerald-800 dark:border-emerald-600 dark:text-emerald-200 text-xs px-1 py-0.5 font-bold transition-all duration-300 ease-in-out"
                      >
                        <Clock className="w-2 h-2 animate-pulse" />
                        <span className="transition-opacity duration-300">{nextPrayer.timeRemaining}</span>
                      </Badge>
                    </div>
                  )}
                </div>
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-1 text-xs">
              <div className="flex items-center gap-1 px-1 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-md">
                <MapPin className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {language === 'ar' ? 'طرابلس، لبنان' : 'Tripoli, Lebanon'}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-1 pb-1 space-y-1 relative">
          {/* بطاقة الصلاة القادمة - مضغوطة جداً */}
          {nextPrayer && (
            <div className="relative mb-1 p-1.5 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-md shadow-md shadow-emerald-500/40 overflow-hidden border-2 border-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800 flex-shrink-0">
              {/* زخارف إسلامية - أنماط متعددة */}
              <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <path d="M 20 50 Q 50 20, 80 50" stroke="white" strokeWidth="2" fill="none" />
                </svg>
              </div>
              <div className="absolute bottom-0 left-0 w-12 h-12 opacity-10">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="30" stroke="white" strokeWidth="1" fill="none" />
                </svg>
              </div>
              {/* أنماط نجمية صغيرة */}
              <div className="absolute top-1 right-1 w-4 h-4 border border-white/20 transform rotate-45"></div>
              <div className="absolute bottom-1 left-1 w-3 h-3 border border-white/20 transform rotate-45"></div>
              
              <div className="relative">
                <div className="flex items-center gap-1 mb-0.5">
                  <Moon className="w-3 h-3 animate-pulse" />
                  <p className="text-xs font-bold uppercase tracking-wider opacity-90">
                    {language === 'ar' ? 'الصلاة القادمة' : 'Next Prayer'}
                  </p>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-base md:text-lg font-black mb-0 drop-shadow-lg">
                      {nextPrayer.nameAr}
                    </p>
                    <p className="text-xs font-medium opacity-90">
                      {nextPrayer.name}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg md:text-xl font-black drop-shadow-lg mb-0.5 font-mono">
                      {nextPrayer.time}
                    </p>
                    <div className="inline-flex items-center gap-0.5 bg-white/20 backdrop-blur-sm px-1 py-0.5 rounded-full border border-white/30">
                      <Clock className="w-2 h-2 animate-pulse" />
                      <span className="text-xs font-bold">
                        {language === 'ar' ? 'بعد' : 'in'} {nextPrayer.timeRemaining}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* جميع الصلوات - تصميم مضغوط جداً */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1">
            {prayers.map((prayer, index) => {
              const status = getPrayerStatus(prayer.time);
              const isNext = stableNextPrayerRef.current?.nameAr === prayer.nameAr;
              
              return (
                <div 
                  key={prayer.key}
                  style={{
                    animation: `slideIn 0.5s ease-out ${index * 0.1}s both`
                  }}
                >
                  <PrayerCardLarge
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
      </Card>

      {/* الرسالة الدعوية اليومية - بطاقة منفصلة كبيرة */}
      <Card className="overflow-hidden border-2 md:border-4 border-purple-300 dark:border-purple-700 bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950/30 dark:via-pink-950/30 dark:to-rose-950/30 shadow-xl flex-shrink-0 relative">
        {/* زخارف إسلامية - أنماط هندسية */}
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none">
          {/* أنماط نجمية */}
          <div 
            className="absolute top-2 left-2 w-20 h-20 border-2 border-purple-300 dark:border-purple-700 transform rotate-45"
            style={{ animation: 'islamicRotate 30s linear infinite' }}
          ></div>
          <div 
            className="absolute bottom-2 right-2 w-16 h-16 border-2 border-pink-300 dark:border-pink-700 transform rotate-45"
            style={{ animation: 'islamicRotate 30s linear infinite', animationDirection: 'reverse' }}
          ></div>
          {/* أنماط قوسية */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path d="M 10 50 Q 50 10, 90 50 Q 50 90, 10 50" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 w-24 h-24 opacity-20">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path d="M 50 10 Q 90 50, 50 90 Q 10 50, 50 10" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          </div>
          {/* أنماط خطية */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-300 dark:via-purple-700 to-transparent"></div>
        </div>
        
        <CardContent className="p-4 md:p-6 relative">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* أيقونة كبيرة */}
            <div className="flex-shrink-0 p-3 md:p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-xl ring-2 ring-purple-200 dark:ring-purple-800 relative overflow-hidden">
              {/* زخرفة داخل الأيقونة */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1 left-1 w-6 h-6 border-2 border-white rounded-full"></div>
                <div className="absolute bottom-1 right-1 w-4 h-4 border-2 border-white rounded-full"></div>
                {/* أنماط نجمية */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 border border-white rounded-full"></div>
              </div>
              {/* زخارف قوسية */}
              <div className="absolute top-0 right-0 w-12 h-12 opacity-15">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <path d="M 20 50 Q 50 20, 80 50" stroke="white" strokeWidth="2" fill="none" />
                </svg>
              </div>
              <Quote className="w-6 h-6 md:w-8 md:h-8 text-white relative z-10" />
            </div>
            
            {/* محتوى الرسالة */}
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-2 mb-2">
                <Badge 
                  variant="outline" 
                  className="border-purple-400 text-purple-800 dark:border-purple-600 dark:text-purple-200 text-sm md:text-base px-3 py-1 font-bold"
                >
                  {dailyMessage.type === 'ayah' && '📖 آية كريمة'}
                  {dailyMessage.type === 'hadith' && '💬 حديث شريف'}
                  {dailyMessage.type === 'wisdom' && '✨ حكمة'}
                  {dailyMessage.type === 'reminder' && '💡 موعظة'}
                </Badge>
              </div>
              <p className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-100 leading-relaxed mb-3 font-amiri text-center md:text-right">
                {dailyMessage.text}
              </p>
              <p className="text-base md:text-lg font-bold text-purple-700 dark:text-purple-300 text-center md:text-right border-t-2 border-purple-200 dark:border-purple-800 pt-2">
                {dailyMessage.source}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSS للـ animations والزخارف */}
      <style jsx global>{`
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
        
        @keyframes islamicRotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

