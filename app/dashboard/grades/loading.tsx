'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { SimplePageLoading } from '@/components/LoadingSpinner';

export default function GradesLoading() {
  return (
    <DashboardLayout>
      <SimplePageLoading />
    </DashboardLayout>
  );
}

