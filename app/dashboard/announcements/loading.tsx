'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { PageLoading } from '@/components/LoadingSpinner';

export default function AnnouncementsLoading() {
  return (
    <DashboardLayout>
      <PageLoading
        text="جاري تحميل الإعلانات..."
        statsCount={4}
        contentType="list"
        contentRows={4}
      />
    </DashboardLayout>
  );
}

