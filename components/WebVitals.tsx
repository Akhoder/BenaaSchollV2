'use client';

import { useEffect } from 'react';
import { reportWebVitals } from '@/lib/analytics';

/**
 * Web Vitals Component
 * Phase 3 UX Improvement: Speed and Performance
 * Tracks and reports Core Web Vitals
 */

export function WebVitals() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Track LCP (Largest Contentful Paint)
    const trackLCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        
        reportWebVitals({
          id: 'lcp',
          name: 'LCP',
          value: lastEntry.renderTime || lastEntry.loadTime,
          label: lastEntry.element?.tagName || 'unknown',
        });
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    };

    // Track FID (First Input Delay)
    const trackFID = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          reportWebVitals({
            id: 'fid',
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            label: entry.name,
          });
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
    };

    // Track CLS (Cumulative Layout Shift)
    const trackCLS = () => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });

        reportWebVitals({
          id: 'cls',
          name: 'CLS',
          value: clsValue,
          label: 'layout-shift',
        });
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    };

    // Initialize tracking
    if ('PerformanceObserver' in window) {
      trackLCP();
      trackFID();
      trackCLS();
    }

    // Track page load time
    window.addEventListener('load', () => {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      
      reportWebVitals({
        id: 'page-load',
        name: 'Page Load',
        value: pageLoadTime,
        label: 'ms',
      });
    });
  }, []);

  return null; // This component doesn't render anything
}

