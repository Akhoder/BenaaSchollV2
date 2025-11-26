'use client';

/**
 * مكون مواقيت الصلاة لصفحة الهبوط
 * Prayer Times Component for Landing Page
 * 
 * نسخة مخصصة لصفحة الهبوط مع تصميم عصري وأنيمشن متقدم
 */

import { useEffect, useState, useRef } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { 
  getTodayPrayerTimes, 
  getNextPrayer,
  formatGregorianDateAr,
  formatGregorianDateEn,
  convertToHijri,
  type PrayerTime 
} from '@/lib/prayerTimes';

export const PrayerTimesLanding = () => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime | null>(null);
  const [nextPrayer, setNextPrayer] = useState<ReturnType<typeof getNextPrayer>>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
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
    setLoading(false);

    // تحديث كل دقيقة
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentDate(now);
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

  if (loading || !prayerTimes || !nextPrayer) return null;

  const prayerIcons = {
    fajr: <Moon className="w-6 h-6" />,
    sunrise: <Sunrise className="w-6 h-6" />,
    dhuhr: <Sun className="w-6 h-6" />,
    asr: <CloudSun className="w-6 h-6" />,
    maghrib: <Sunset className="w-6 h-6" />,
    isha: <Stars className="w-6 h-6" />,
  };

  const prayers = [
    { key: 'fajr', nameAr: 'الفجر', name: 'Fajr', time: prayerTimes.fajr },
    { key: 'sunrise', nameAr: 'الشروق', name: 'Sunrise', time: prayerTimes.sunrise },
    { key: 'dhuhr', nameAr: 'الظهر', name: 'Dhuhr', time: prayerTimes.dhuhr },
    { key: 'asr', nameAr: 'العصر', name: 'Asr', time: prayerTimes.asr },
    { key: 'maghrib', nameAr: 'المغرب', name: 'Maghrib', time: prayerTimes.maghrib },
    { key: 'isha', nameAr: 'العشاء', name: 'Isha', time: prayerTimes.isha },
  ];

  return (
    <section className="relative py-20 overflow-hidden">
      {/* خلفية متدرجة */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950 dark:via-teal-950 dark:to-cyan-950"></div>
      
      {/* نقاط الخلفية */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, currentColor 2px, transparent 2px)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* دوائر متحركة في الخلفية */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200 dark:bg-emerald-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-40 right-10 w-72 h-72 bg-teal-200 dark:bg-teal-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-cyan-200 dark:bg-cyan-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* العنوان */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium mb-4">
            <Clock className="w-4 h-4" />
            <span>مواقيت الصلاة اليوم</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
            أوقات الصلاة
          </h2>
          
          {/* الموقع والتاريخ */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 flex-wrap">
            {/* الموقع */}
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg shadow-sm">
              <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-slate-800 dark:text-slate-200">طرابلس، لبنان</span>
            </div>
            
            {/* التاريخ الميلادي */}
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow-sm">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatGregorianDateAr(currentDate)}
              </span>
            </div>
            
            {/* التاريخ الهجري - محسوب لليوم */}
            <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg shadow-sm">
              <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span className="font-bold text-slate-800 dark:text-slate-200 font-arabic">
                {hijriDate.day} {hijriDate.monthName} {hijriDate.year} هـ
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* الصلاة القادمة - بطاقة كبيرة */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 group">
              <div className="relative p-8 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-3xl shadow-2xl shadow-emerald-500/40 overflow-hidden transform transition-all duration-500 hover:scale-105">
                {/* خلفية متحركة */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 -left-4 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse"></div>
                  <div className="absolute bottom-0 -right-4 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse animation-delay-2000"></div>
                </div>

                {/* نقطة مضيئة */}
                <span className="absolute top-6 right-6 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                </span>

                <div className="relative">
                  {/* الأيقونة */}
                  <div className="mb-6 inline-flex p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                    <Moon className="w-12 h-12 animate-pulse" />
                  </div>

                  {/* النص */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-wider opacity-90 mb-2">
                        الصلاة القادمة
                      </p>
                      <h3 className="text-5xl font-black mb-2 drop-shadow-lg">
                        {nextPrayer.nameAr}
                      </h3>
                      <p className="text-xl font-medium opacity-90">
                        {nextPrayer.name}
                      </p>
                    </div>

                    <div className="pt-6 border-t border-white/20">
                      <p className="text-sm font-medium opacity-90 mb-2">الوقت</p>
                      <p className="text-6xl font-black drop-shadow-lg mb-2">
                        {nextPrayer.time}
                      </p>
                      <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                        <Clock className="w-5 h-5" />
                        <span className="text-lg font-bold">
                          بعد {nextPrayer.timeRemaining}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* جميع الصلوات */}
          <div className="lg:col-span-2">
            <div className="grid sm:grid-cols-2 gap-4">
              {prayers.map((prayer, index) => {
                // استخدام الصلاة القادمة المستقرة لتجنب الوميض
                const isNext = stableNextPrayerRef.current?.nameAr === prayer.nameAr;
                
                return (
                  <div
                    key={prayer.key}
                    style={{
                      animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                    }}
                  >
                    <div className={`
                      group relative p-6 rounded-2xl transition-all duration-500 cursor-pointer
                      ${isNext 
                        ? 'bg-white/90 dark:bg-slate-800/90 shadow-xl ring-2 ring-emerald-500 scale-105' 
                        : 'bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:scale-105'
                      }
                      backdrop-blur-sm
                    `}>
                      {/* مؤشر للصلاة القادمة */}
                      {isNext && (
                        <div className="absolute -top-2 -right-2 flex h-5 w-5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500"></span>
                        </div>
                      )}

                      <div className="flex items-center gap-4 mb-4">
                        <div className={`
                          p-3 rounded-xl transition-all duration-500 group-hover:rotate-12 group-hover:scale-110
                          ${isNext 
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg' 
                            : 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 text-emerald-600 dark:text-emerald-400'
                          }
                        `}>
                          {prayerIcons[prayer.key as keyof typeof prayerIcons]}
                        </div>
                        <div className="flex-1">
                          <h4 className={`
                            text-2xl font-black mb-1
                            ${isNext 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                            }
                          `}>
                            {prayer.nameAr}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                            {prayer.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className={`
                          text-3xl font-black font-mono
                          ${isNext 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-slate-700 dark:text-slate-300'
                          }
                        `}>
                          {prayer.time.substring(0, 5)}
                        </p>
                        {isNext && (
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-bold animate-pulse">
                            <span>التالي</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* خط تزييني */}
                      <div className={`
                        absolute bottom-0 left-0 right-0 h-1 rounded-full transition-all duration-500
                        ${isNext 
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500' 
                          : 'bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent opacity-0 group-hover:opacity-100'
                        }
                      `}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CSS للـ animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </section>
  );
};

