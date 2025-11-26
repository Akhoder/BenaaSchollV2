'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { PageLoading } from '@/components/LoadingSpinner';

export default function AttendanceLoading() {
  return (
    <DashboardLayout>
      <PageLoading
        text="جاري تحميل الحضور..."
        statsCount={5}
        contentType="table"
        contentRows={8}
      />
    </DashboardLayout>
  );
}

