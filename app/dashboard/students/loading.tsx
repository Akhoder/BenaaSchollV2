'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeaderSkeleton, TableSkeleton, DashboardStatsSkeleton } from '@/components/SkeletonLoaders';

export default function StudentsLoading() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton />
        <DashboardStatsSkeleton />
        <TableSkeleton rows={10} />
      </div>
    </DashboardLayout>
  );
}

