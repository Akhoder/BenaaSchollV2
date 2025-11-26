'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { PageLoading } from '@/components/LoadingSpinner';

export default function TeachersLoading() {
  return (
    <DashboardLayout>
      <PageLoading
        text="جاري تحميل المعلمين..."
        statsCount={4}
        contentType="table"
        contentRows={8}
      />
    </DashboardLayout>
  );
}

