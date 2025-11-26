'use client';

/**
 * صفحة مواقيت الصلاة - محسّنة للعرض على شاشة التلفاز
 * Prayer Times Page - Enhanced for TV Display
 * 
 * صفحة مخصصة لعرض مواقيت الصلاة بشكل احترافي
 * مناسبة للعرض في حرم المسجد على شاشة التلفاز
 * متاحة لجميع المستخدمين (مدير، معلم، طالب، مشرف)
 */

import { PrayerTimesDisplay } from '@/components/PrayerTimesDisplay';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function PrayerTimesPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-2 md:px-4 py-2 md:py-4 h-[calc(100vh-4rem)] overflow-hidden">
        <PrayerTimesDisplay />
      </div>
    </DashboardLayout>
  );
}

