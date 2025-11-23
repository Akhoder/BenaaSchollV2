'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeaderSkeleton, CardGridSkeleton, DashboardStatsSkeleton } from '@/components/SkeletonLoaders';

export default function ClassesLoading() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton />
        <DashboardStatsSkeleton />
        <CardGridSkeleton count={6} />
      </div>
    </DashboardLayout>
  );
}

