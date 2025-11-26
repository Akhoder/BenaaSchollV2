'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { PageLoading } from '@/components/LoadingSpinner';

export default function DashboardLoading() {
  return (
    <DashboardLayout>
      <PageLoading
        text="جاري التحميل..."
        showStats={true}
        statsCount={4}
        contentType="grid"
        contentRows={6}
      />
    </DashboardLayout>
  );
}


