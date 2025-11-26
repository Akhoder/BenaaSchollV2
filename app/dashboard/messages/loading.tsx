'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { PageLoading } from '@/components/LoadingSpinner';

export default function MessagesLoading() {
  return (
    <DashboardLayout>
      <PageLoading
        text="جاري تحميل الرسائل..."
        statsCount={4}
        contentType="list"
        contentRows={5}
      />
    </DashboardLayout>
  );
}

