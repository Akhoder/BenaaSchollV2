'use client';

/**
 * مكون مواقيت الصلاة لصفحة الهبوط - تصميم مدمج
 * Prayer Times Component for Landing Page - Compact Design
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
  Calendar
} from 'lucide-react';
import { 
  getTodayPrayerTimes, 
  getNextPrayer,
  formatGregorianDateAr,
  convertToHijri,
  type PrayerTime 
} from '@/lib/prayerTimes';

export const PrayerTimesLanding = () => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime | null>(null);
  const [nextPrayer, setNextPrayer] = useState<ReturnType<typeof getNextPrayer>>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hijriDate, setHijriDate] = useState(convertToHijri());
  
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

    const interval = setInterval(() => {
      const now = new Date();
      setCurrentDate(now);
      setHijriDate(convertToHijri(now));
      
      if (times) {
        const currentNextPrayer = getNextPrayer(times);
        const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
        const hasChanged = stableNextPrayerRef.current?.nameAr !== currentNextPrayer?.nameAr;
        
        if (hasChanged && timeSinceLastUpdate > 120000) {
          stableNextPrayerRef.current = currentNextPrayer;
          lastUpdateRef.current = Date.now();
          setNextPrayer(currentNextPrayer);
        } else {
          setNextPrayer(stableNextPrayerRef.current);
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const formatTime12 = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'م' : 'ص';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${minutes} ${ampm}`;
  };

  if (loading || !prayerTimes || !nextPrayer) return null;

  const prayerIcons = {
    fajr: <Moon className="w-5 h-5" />,
    sunrise: <Sunrise className="w-5 h-5" />,
    dhuhr: <Sun className="w-5 h-5" />,
    asr: <CloudSun className="w-5 h-5" />,
    maghrib: <Sunset className="w-5 h-5" />,
    isha: <Stars className="w-5 h-5" />,
  };

  const prayers = [
    { key: 'fajr', nameAr: 'الفجر', time: prayerTimes.fajr },
    { key: 'sunrise', nameAr: 'الشروق', time: prayerTimes.sunrise },
    { key: 'dhuhr', nameAr: 'الظهر', time: prayerTimes.dhuhr },
    { key: 'asr', nameAr: 'العصر', time: prayerTimes.asr },
    { key: 'maghrib', nameAr: 'المغرب', time: prayerTimes.maghrib },
    { key: 'isha', nameAr: 'العشاء', time: prayerTimes.isha },
  ];

  return (
    <section className="relative py-10 overflow-hidden">
      {/* Compact Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5"></div>
      
      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        {/* Compact Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
               <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-display text-primary">مواقيت الصلاة</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  طرابلس، ليبيا
                </span>
                <span>•</span>
                <span className="font-arabic">
                  {hijriDate.day} {hijriDate.monthName} {hijriDate.year} هـ
                </span>
              </div>
            </div>
          </div>
          
          {/* Next Prayer Timer - Compact */}
          <div className="flex items-center gap-3 bg-background/80 backdrop-blur-sm border border-primary/10 px-4 py-2 rounded-full shadow-sm">
            <span className="text-sm text-muted-foreground">الصلاة القادمة:</span>
            <span className="font-bold text-primary">{nextPrayer.nameAr}</span>
            <span className="w-px h-4 bg-border"></span>
            <span className="font-mono font-bold text-secondary dir-ltr">
               {nextPrayer.timeRemaining}
            </span>
          </div>
        </div>

        {/* Horizontal Prayer Strip */}
        <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-primary/10 p-2 overflow-hidden">
           <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
             {prayers.map((prayer) => {
               const isNext = stableNextPrayerRef.current?.nameAr === prayer.nameAr;
               
               return (
                 <div 
                   key={prayer.key}
                   className={`
                     relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300
                     ${isNext 
                       ? 'bg-gradient-to-b from-primary to-primary/90 text-white shadow-md scale-105 z-10' 
                       : 'hover:bg-primary/5 text-muted-foreground hover:text-primary'
                     }
                   `}
                 >
                   {isNext && (
                     <span className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full animate-pulse border-2 border-white"></span>
                   )}
                   
                   <div className={`mb-1 ${isNext ? 'text-white' : 'text-current'}`}>
                     {prayerIcons[prayer.key as keyof typeof prayerIcons]}
                   </div>
                   
                   <span className="text-sm font-bold mb-1">{prayer.nameAr}</span>
                   
                   <span className={`text-sm font-mono ${isNext ? 'text-white/90' : ''}`}>
                     {formatTime12(prayer.time)}
                   </span>
                 </div>
               );
             })}
           </div>
        </div>
      </div>
    </section>
  );
};
