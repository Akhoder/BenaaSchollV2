'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardLoadingSpinner } from '@/components/LoadingSpinner';

export default function DashboardLoading() {
  return (
    <DashboardLayout>
      <DashboardLoadingSpinner
        text="Loading..."
        subtext="Please wait..."
      />
    </DashboardLayout>
  );
}


