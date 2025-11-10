'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardStatsSkeleton, CardGridSkeleton, PageHeaderSkeleton } from '@/components/SkeletonLoaders';

export default function DashboardLoading() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton />
        <DashboardStatsSkeleton />
        <CardGridSkeleton count={3} />
      </div>
    </DashboardLayout>
  );
}


