'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeaderSkeleton, ListSkeleton, DashboardStatsSkeleton } from '@/components/SkeletonLoaders';

export default function GradesLoading() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton />
        <DashboardStatsSkeleton />
        <ListSkeleton items={5} />
      </div>
    </DashboardLayout>
  );
}

