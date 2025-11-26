'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { PageLoading } from '@/components/LoadingSpinner';

export default function MyClassesLoading() {
  return (
    <DashboardLayout>
      <PageLoading
        text="جاري تحميل فصولي..."
        showStats={false}
        contentType="grid"
        contentRows={4}
      />
    </DashboardLayout>
  );
}

