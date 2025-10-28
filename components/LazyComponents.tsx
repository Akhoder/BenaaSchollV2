'use client';

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy loading للمكونات الثقيلة
export const LazyCharts = lazy(() => import('@/components/Charts').then(module => ({ 
  default: module.QuickStatsChart 
})));

export const LazyEnhancedTable = lazy(() => import('@/components/EnhancedTable'));

export const LazyOptimizedTable = lazy(() => import('@/components/OptimizedTable'));

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
  <Suspense fallback={<LoadingSpinner text="جاري تحميل الرسوم البيانية..." />}>
    <LazyCharts {...props} />
  </Suspense>
);
