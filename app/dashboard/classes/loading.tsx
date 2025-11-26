'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { PageLoading } from '@/components/LoadingSpinner';

export default function ClassesLoading() {
  return (
    <DashboardLayout>
      <PageLoading
        text="جاري تحميل الفصول..."
        statsCount={4}
        contentType="table"
        contentRows={5}
      />
    </DashboardLayout>
  );
}

