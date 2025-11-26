'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { PageLoading } from '@/components/LoadingSpinner';

export default function StudentsLoading() {
  return (
    <DashboardLayout>
      <PageLoading
        text="جاري تحميل الطلاب..."
        statsCount={4}
        contentType="table"
        contentRows={10}
      />
    </DashboardLayout>
  );
}

