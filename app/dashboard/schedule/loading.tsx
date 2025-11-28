'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { PageLoading } from '@/components/LoadingSpinner';

export default function ScheduleLoading() {
  return (
    <DashboardLayout>
      <PageLoading
        text="جاري تحميل الجدول..."
        statsCount={4}
        contentType="grid"
        contentRows={7}
      />
    </DashboardLayout>
  );
}

