'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeaderSkeleton, CardGridSkeleton } from '@/components/SkeletonLoaders';

export default function MyClassesLoading() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton />
        <CardGridSkeleton count={4} />
      </div>
    </DashboardLayout>
  );
}

