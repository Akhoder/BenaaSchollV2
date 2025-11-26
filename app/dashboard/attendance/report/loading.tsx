'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { PageLoading } from '@/components/LoadingSpinner';

export default function AttendanceReportLoading() {
  return (
    <DashboardLayout>
      <PageLoading
        text="جاري تحميل التقرير..."
        statsCount={4}
        contentType="table"
        contentRows={8}
      />
    </DashboardLayout>
  );
}

