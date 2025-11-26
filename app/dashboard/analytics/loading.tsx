'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { PageLoading } from '@/components/LoadingSpinner';

export default function AnalyticsLoading() {
  return (
    <DashboardLayout>
      <PageLoading
        text="جاري تحميل التحليلات..."
        statsCount={4}
        contentType="table"
        contentRows={6}
      />
    </DashboardLayout>
  );
}

