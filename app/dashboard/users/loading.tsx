'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { PageLoading } from '@/components/LoadingSpinner';

export default function UsersLoading() {
  return (
    <DashboardLayout>
      <PageLoading
        text="جاري تحميل المستخدمين..."
        statsCount={5}
        contentType="table"
        contentRows={10}
      />
    </DashboardLayout>
  );
}

