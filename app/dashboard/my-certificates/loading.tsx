'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { SimplePageLoading } from '@/components/LoadingSpinner';

export default function MyCertificatesLoading() {
  return (
    <DashboardLayout>
      <SimplePageLoading />
    </DashboardLayout>
  );
}

