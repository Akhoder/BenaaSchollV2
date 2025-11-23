'use client';

import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { DashboardStatsSkeleton } from '@/components/SkeletonLoaders';

/**
 * Lazy Components with Code Splitting
 * Phase 3 UX Improvement: Speed and Performance
 * Lazy loads heavy components to improve initial page load
 */

// Lazy loading للمكونات الثقيلة
export const LazyCharts = lazy(() => import('@/components/Charts').then(module => ({ 
  default: module.QuickStatsChart 
})));

export const LazyEnhancedTable = lazy(() => import('@/components/EnhancedTable').then(m => ({ default: m.EnhancedTable })));

export const LazyOptimizedTable = lazy(() => import('@/components/OptimizedTable').then(m => ({ default: m.OptimizedTable })));

// Lazy load admin-only components (commented out - components don't exist yet)
// export const LazyAdminPanel = lazy(() => 
//   import('@/components/AdminPanel').catch(() => ({ 
//     default: () => <div>Admin panel not available</div> 
//   }))
// );

// Lazy load heavy form components (commented out - components don't exist yet)
// export const LazyRichTextEditor = lazy(() => 
//   import('@/components/RichTextEditor').catch(() => ({ 
//     default: () => <div>Editor not available</div> 
//   }))
// );

// Lazy load file uploader (commented out - components don't exist yet)
// export const LazyFileUploader = lazy(() => 
//   import('@/components/FileUploader').catch(() => ({ 
//     default: () => <div>File uploader not available</div> 
//   }))
// );

// مكون تحميل محسن
export const LoadingSpinner = ({ 
  size = 'default', 
  text = 'جاري التحميل...' 
}: { 
  size?: 'sm' | 'default' | 'lg'; 
  text?: string; 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    default: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-emerald-600`} />
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{text}</p>
    </div>
  );
};

// HOC لتحسين الأداء
export const withPerformanceOptimization = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return React.memo(Component);
};

// مكون محسن للجداول مع Suspense
export const OptimizedTableWithSuspense = (props: any) => (
  <Suspense fallback={<LoadingSpinner text="جاري تحميل الجدول..." />}>
    <LazyOptimizedTable {...props} />
  </Suspense>
);

// مكون محسن للرسوم البيانية مع Suspense
export const ChartsWithSuspense = (props: any) => (
  <Suspense fallback={<DashboardStatsSkeleton />}>
    <LazyCharts {...props} />
  </Suspense>
);

// Generic lazy wrapper with Suspense
export function withLazyLoading<P extends Record<string, any>>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyWrapper(props: P) {
    return (
      <Suspense fallback={fallback || <LoadingSpinner />}>
        <LazyComponent {...(props as any)} />
      </Suspense>
    );
  };
}
